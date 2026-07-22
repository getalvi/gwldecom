import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, UnauthorizedError, rbacErrorResponse } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(50) })).min(1).max(50),
  shippingAddress: z.object({
    fullName: z.string().min(1).max(200),
    phone: z.string().min(6).max(20),
    addressLine1: z.string().min(1).max(300),
    city: z.string().min(1).max(100),
    district: z.string().min(1).max(100),
    postalCode: z.string().max(20).optional(),
  }),
});

/**
 * POST /api/orders
 * SECURITY: prices and stock are re-read from the database here, never
 * trusted from the client cart. This is the single most important rule in
 * any checkout flow — the client can send whatever it wants, only the
 * server's own product data determines what gets charged.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => {
      throw new UnauthorizedError("Please sign in to place an order");
    });

    const { success } = await checkRateLimit(`user:${user.id}`, "checkout", 10, 60);
    if (!success) return Response.json({ error: "Too many checkout attempts, please wait" }, { status: 429 });

    const body = checkoutSchema.parse(await request.json());
    const supabase = await createClient();

    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, price, stock_quantity, status, title")
      .in("id", productIds);

    if (fetchError) return Response.json({ error: "Failed to load products" }, { status: 500 });

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    let total = 0;
    const orderItemsPayload: { product_id: string; quantity: number; unit_price: number }[] = [];

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "published") {
        return Response.json({ error: `Product unavailable: ${item.productId}` }, { status: 409 });
      }
      if (product.stock_quantity < item.quantity) {
        return Response.json({ error: `Insufficient stock for "${product.title}"` }, { status: 409 });
      }
      total += product.price * item.quantity;
      orderItemsPayload.push({ product_id: product.id, quantity: item.quantity, unit_price: product.price });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        total,
        shipping_address: body.shippingAddress,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) return Response.json({ error: orderError.message }, { status: 500 });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload.map((i) => ({ ...i, order_id: order.id })));

    if (itemsError) {
      // Best-effort rollback: remove the orphaned order if items failed to insert
      await supabase.from("orders").delete().eq("id", order.id);
      return Response.json({ error: "Failed to save order items" }, { status: 500 });
    }

    // Decrement stock. Note: on the free tier without a Postgres function
    // this isn't perfectly atomic under heavy concurrency — for production
    // scale, move this into a `decrement_stock` RPC with row locking.
    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      await supabase
        .from("products")
        .update({ stock_quantity: product.stock_quantity - item.quantity })
        .eq("id", item.productId);
    }

    await logAudit({
      actorId: user.id,
      action: "product.update", // stock change
      entityType: "order",
      entityId: order.id,
      metadata: { total, itemCount: body.items.length },
    });

    return Response.json({ orderId: order.id, total }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return rbacErrorResponse(err);
  }
}
