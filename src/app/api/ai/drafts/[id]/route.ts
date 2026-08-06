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

    // draft.source_type / draft.source_url are new, additive columns. If the
    // Supabase generated types (src/types/database.ts) haven't been
    // regenerated yet after running the migration, TS won't know about them
    // — this cast keeps the build green either way.
    const draftRow = draft as typeof draft & { source_type?: string; source_url?: string | null };

    // Approve: merge AI extraction with any admin overrides, validate, create product.
    // draft.source_type is a new, additive column (default 'image') — older
    // rows created before URL import existed always take the image branch,
    // so this is unchanged behavior for the existing pipeline.
    const isUrlImport = draftRow.source_type === "url";

    let merged: Record<string, unknown>;

    if (isUrlImport) {
      const extracted = draft.extracted as {
        title: string;
        description: string;
        brand: string | null;
        sku: string | null;
        price: number | null;
        currency: string | null;
        images: string[];
        specifications: Record<string, string>;
        attributes: Record<string, string[]>;
        tags: string[];
      };

      const images = (extracted.images?.length ? extracted.images : draft.source_image_url ? [draft.source_image_url] : [])
        .slice(0, 12)
        .map((url) => ({ url, altText: body.overrides?.title ?? extracted.title }));

      merged = {
        title: body.overrides?.title ?? extracted.title,
        slug: body.overrides?.slug ?? toSlug(body.overrides?.title ?? extracted.title),
        description: body.overrides?.description ?? extracted.description,
        specifications: body.overrides?.specifications ?? extracted.specifications,
        attributes: body.overrides?.attributes ?? extracted.attributes,
        tags: body.overrides?.tags ?? extracted.tags,
        categoryId: body.overrides?.categoryId ?? null,
        price: body.overrides?.price ?? extracted.price ?? 0,
        compareAtPrice: body.overrides?.compareAtPrice ?? null,
        currency: body.overrides?.currency ?? extracted.currency ?? "BDT",
        sku: body.overrides?.sku ?? extracted.sku ?? undefined,
        stockQuantity: body.overrides?.stockQuantity ?? 0,
        status: body.overrides?.status ?? ("pending_review" as const),
        images,
      };

      // Brand/category auto-mapping (creating a brands row, matching an
      // existing category) is real scope from the original spec that's
      // intentionally not built in this slice — same "gap list" spirit as
      // the project README. Surfacing the raw brand string here means it's
      // never silently lost; wiring it to a real brands table is a follow-up.
      const specs = merged.specifications as Record<string, string>;
      if (extracted.brand && !specs["Brand"]) {
        specs["Brand"] = extracted.brand;
      }
    } else {
      const extracted = draft.extracted as {
        title: string;
        description: string;
        estimatedPriceBDT: number | null;
        specifications: Record<string, string>;
        attributes: Record<string, string[]>;
        tags: string[];
      };

      merged = {
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
        images: draft.source_image_url ? [{ url: draft.source_image_url, altText: extracted.title }] : [],
      };
    }

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

    const imagesToInsert = parsed.data.images.length
      ? parsed.data.images
      : draft.source_image_url
        ? [{ url: draft.source_image_url, altText: parsed.data.title }]
        : [];

    if (imagesToInsert.length > 0) {
      await supabase.from("product_images").insert(
        imagesToInsert.map((img, position) => ({
          product_id: product.id,
          url: img.url,
          alt_text: img.altText ?? parsed.data.title,
          position,
        }))
      );
    }

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
