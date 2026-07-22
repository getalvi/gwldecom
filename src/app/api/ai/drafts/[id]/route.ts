import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { productSchema, toSlug } from "@/lib/validation/product";
import { logAudit } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  // Admin-edited fields override the raw AI extraction before publishing
  overrides: productSchema.partial().optional(),
});

/**
 * PATCH /api/ai/drafts/:id
 * The human-in-the-loop step: admin/staff reviews an AI draft, optionally
 * edits any field, and either approves it (creates a real `products` row)
 * or rejects it (discarded, no product created).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireRole(["admin", "staff"]);
    const body = decisionSchema.parse(await request.json());

    const supabase = await createClient();
    const { data: draft, error: fetchError } = await supabase
      .from("ai_import_drafts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !draft) return Response.json({ error: "Draft not found" }, { status: 404 });
    if (draft.status !== "pending_review") {
      return Response.json({ error: "Draft already reviewed" }, { status: 409 });
    }

    if (body.decision === "reject") {
      await supabase
        .from("ai_import_drafts")
        .update({ status: "rejected", reviewed_by: user.id })
        .eq("id", id);
      await logAudit({ actorId: user.id, action: "ai_import.reject", entityType: "ai_import_draft", entityId: id });
      return Response.json({ success: true, status: "rejected" });
    }

    // Approve: merge AI extraction with any admin overrides, validate, create product.
    const extracted = draft.extracted as {
      title: string;
      description: string;
      estimatedPriceBDT: number | null;
      specifications: Record<string, string>;
      attributes: Record<string, string[]>;
      tags: string[];
    };

    const merged = {
      title: body.overrides?.title ?? extracted.title,
      slug: body.overrides?.slug ?? toSlug(extracted.title),
      description: body.overrides?.description ?? extracted.description,
      specifications: body.overrides?.specifications ?? extracted.specifications,
      attributes: body.overrides?.attributes ?? extracted.attributes,
      tags: body.overrides?.tags ?? extracted.tags,
      categoryId: body.overrides?.categoryId ?? null,
      price: body.overrides?.price ?? extracted.estimatedPriceBDT ?? 0,
      compareAtPrice: body.overrides?.compareAtPrice ?? null,
      currency: "BDT",
      stockQuantity: body.overrides?.stockQuantity ?? 0,
      status: body.overrides?.status ?? ("pending_review" as const), // still requires a final publish step
      images: [{ url: draft.source_image_url, altText: extracted.title }],
    };

    const parsed = productSchema.safeParse(merged);
    if (!parsed.success) {
      return Response.json({ error: "Merged product failed validation", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        specifications: parsed.data.specifications,
        attributes: parsed.data.attributes,
        tags: parsed.data.tags,
        price: parsed.data.price,
        currency: parsed.data.currency,
        stock_quantity: parsed.data.stockQuantity,
        status: parsed.data.status,
        source: "ai_import",
        ai_confidence: draft.confidence,
        created_by: user.id,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      const status = insertError.code === "23505" ? 409 : 500;
      return Response.json({ error: insertError.message }, { status });
    }

    await supabase.from("product_images").insert({
      product_id: product.id,
      url: draft.source_image_url,
      alt_text: parsed.data.title,
      position: 0,
    });

    await supabase
      .from("ai_import_drafts")
      .update({ status: "approved", reviewed_by: user.id, resulting_product_id: product.id })
      .eq("id", id);

    await logAudit({
      actorId: user.id,
      action: "ai_import.approve",
      entityType: "product",
      entityId: product.id,
      metadata: { draftId: id },
    });

    return Response.json({ success: true, status: "approved", product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid request body", details: err.flatten() }, { status: 400 });
    }
    return rbacErrorResponse(err);
  }
}
