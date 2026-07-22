import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { productSchema, toSlug } from "@/lib/validation/product";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/products — public, paginated, cached product listing.
 * RLS ensures anonymous callers only ever see status='published' rows,
 * so no extra filtering is needed here even though we don't check auth.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, title, slug, price, compare_at_price, currency, status, product_images(url, alt_text, position)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) query = query.eq("category_id", category);
  if (q) query = query.textSearch("title", q, { type: "websearch" });

  const { data, error, count } = await query;
  if (error) {
    console.error("[api/products GET]", error);
    return Response.json({ error: "Failed to fetch products" }, { status: 500 });
  }

  return Response.json(
    { products: data, page, pageSize, total: count ?? 0 },
    {
      headers: {
        // Public listing: safe to cache at the edge briefly (ISR-friendly, cuts function invocations)
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

/**
 * POST /api/products — create a product. Staff/Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const user = await requireRole(["admin", "staff"]);

    const { success } = await checkRateLimit(`user:${user.id}`, "product-create", 30, 60);
    if (!success) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const slug = input.slug || toSlug(input.title);

    const supabase = await createClient();
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        title: input.title,
        slug,
        description: input.description,
        specifications: input.specifications,
        attributes: input.attributes,
        tags: input.tags,
        category_id: input.categoryId ?? null,
        price: input.price,
        compare_at_price: input.compareAtPrice ?? null,
        currency: input.currency,
        stock_quantity: input.stockQuantity,
        sku: input.sku ?? null,
        status: input.status,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation (duplicate slug/sku) — surface as 409, not 500
      const status = error.code === "23505" ? 409 : 500;
      return Response.json({ error: error.message }, { status });
    }

    if (input.images.length) {
      await supabase.from("product_images").insert(
        input.images.map((img, i) => ({
          product_id: product.id,
          url: img.url,
          alt_text: img.altText ?? input.title,
          position: i,
        }))
      );
    }

    await logAudit({
      actorId: user.id,
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      metadata: { title: input.title, status: input.status },
      ipAddress: ip,
    });

    return Response.json({ id: product.id, slug }, { status: 201 });
  } catch (err) {
    return rbacErrorResponse(err);
  }
}
