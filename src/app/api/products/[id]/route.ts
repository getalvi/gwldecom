import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { productUpdateSchema } from "@/lib/validation/product";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(url, alt_text, position), categories(name, slug)")
    .eq("id", id)
    .single();

  if (error) return Response.json({ error: "Product not found" }, { status: 404 });
  return Response.json({ product: data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = getClientIp(request);
    const user = await requireRole(["admin", "staff"]);

    const body = await request.json();
    const parsed = productUpdateSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { id: _omit, images, categoryId, compareAtPrice, stockQuantity, ...rest } = parsed.data;
    const updatePayload: Record<string, unknown> = { ...rest };
    if (categoryId !== undefined) updatePayload.category_id = categoryId;
    if (compareAtPrice !== undefined) updatePayload.compare_at_price = compareAtPrice;
    if (stockQuantity !== undefined) updatePayload.stock_quantity = stockQuantity;

    const supabase = await createClient();
    const { error } = await supabase.from("products").update(updatePayload).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await logAudit({
      actorId: user.id,
      action: rest.status === "published" ? "product.publish" : "product.update",
      entityType: "product",
      entityId: id,
      metadata: { fields: Object.keys(updatePayload) },
      ipAddress: ip,
    });

    return Response.json({ success: true });
  } catch (err) {
    return rbacErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = getClientIp(request);
    const user = await requireRole(["admin"]); // hard delete: admin-only

    const supabase = await createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await logAudit({ actorId: user.id, action: "product.delete", entityType: "product", entityId: id, ipAddress: ip });
    return Response.json({ success: true });
  } catch (err) {
    return rbacErrorResponse(err);
  }
}
