import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser, UnauthorizedError, rbacErrorResponse } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(50) })).min(1).max(50),
  shippingAddress: z.object({ fullName: z.string().min(1).max(200), phone: z.string().min(6).max(20), addressLine1: z.string().min(1).max(300), city: z.string().min(1).max(100), district: z.string().min(1).max(100), postalCode: z.string().max(20).optional() }),
  paymentMethod: z.enum(["cod","sslcommerz","bkash","nagad","rocket"]).default("cod"),
  couponCode: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));
    const status = searchParams.get("status");

    let query = supabase
      .from("orders")
      .select("id, status, payment_method, payment_status, total, shipping_address, created_at, updated_at, profiles!customer_id(id, full_name, email, phone), order_items(id, quantity, unit_price, products(id, title, slug, product_images(url, position)))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (user.role === "customer") query = query.eq("customer_id", user.id);
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ orders: data, total: count ?? 0, page, pageSize });
  } catch (err) { return rbacErrorResponse(err); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => { throw new UnauthorizedError("Please sign in to place an order"); });
    const { success } = await checkRateLimit(`user:${user.id}`, "checkout", 10, 60);
    if (!success) return Response.json({ error: "Too many checkout attempts, please wait" }, { status: 429 });

    const body = checkoutSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: products, error: fetchError } = await supabase
      .from("products").select("id, price, stock_quantity, status, title").in("id", body.items.map(i => i.productId));
    if (fetchError) return Response.json({ error: "Failed to load products" }, { status: 500 });

    const productMap = new Map((products ?? []).map(p => [p.id, p]));
    let total = 0;
    const orderItemsPayload: { product_id: string; quantity: number; unit_price: number }[] = [];

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "published") return Response.json({ error: `Product unavailable: ${item.productId}` }, { status: 409 });
      if (product.stock_quantity < item.quantity) return Response.json({ error: `Insufficient stock for "${product.title}"` }, { status: 409 });
      total += product.price * item.quantity;
      orderItemsPayload.push({ product_id: product.id, quantity: item.quantity, unit_price: product.price });
    }

    let discount = 0;
    if (body.couponCode) {
      const { data: coupon } = await supabase.from("coupons").select("*").eq("code", body.couponCode.toUpperCase()).eq("active", true).single();
      if (coupon) {
        const ok = (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && (!coupon.max_uses || coupon.used_count < coupon.max_uses) && (!coupon.min_order_amount || total >= coupon.min_order_amount);
        if (ok) {
          discount = coupon.type === "percentage" ? (total * coupon.value) / 100 : coupon.value;
          total = Math.max(0, total - discount);
          await supabase.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("id", coupon.id);
        }
      }
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ customer_id: user.id, total, shipping_address: body.shippingAddress, status: "pending", payment_method: body.paymentMethod, payment_status: "unpaid" })
      .select("id").single();
    if (orderError) return Response.json({ error: orderError.message }, { status: 500 });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload.map(i => ({ ...i, order_id: order.id })));
    if (itemsError) { await supabase.from("orders").delete().eq("id", order.id); return Response.json({ error: "Failed to save order items" }, { status: 500 }); }

    // Use service role for stock decrement to bypass RLS issues
    const svc = createServiceRoleClient();
    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      await svc.from("products").update({ stock_quantity: product.stock_quantity - item.quantity }).eq("id", item.productId);
    }

    await logAudit({ actorId: user.id, action: "product.update", entityType: "order", entityId: order.id, metadata: { total, discount, itemCount: body.items.length } as Record<string, unknown> });
    return Response.json({ orderId: order.id, total, discount }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
