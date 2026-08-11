import { NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/rateLimit";
import { assertValidImageUpload, processProductImage } from "@/lib/image";
import { extractProductsFromImage } from "@/lib/ai/vlm";
import { logAudit } from "@/lib/audit";
import { nanoid } from "nanoid";

export const maxDuration = 30; // seconds — VLM calls can be slow; stay under Vercel free-tier 60s cap

/**
 * POST /api/ai/extract-product
 * multipart/form-data with field "image".
 *
 * Flow: staff/admin uploads a product photo, screenshot, or full-page
 * screenshot -> we compress it to WebP -> store it in Supabase Storage ->
 * send the public URL to the VLM -> validate the structured output ->
 * stage it as an ai_import_drafts row for human review (never auto-publishes).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["admin", "staff"]);

    // AI calls are the most expensive/abusable route in the app — tight limit.
    const { success, remaining } = await checkRateLimit(`user:${user.id}`, "ai-extract", 15, 60);
    if (!success) {
      return Response.json({ error: "AI rate limit exceeded, try again shortly" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return Response.json({ error: "No image provided (field name must be 'image')" }, { status: 400 });
    }

    assertValidImageUpload({ size: file.size, type: file.type });

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = await processProductImage(inputBuffer);

    // Upload the compressed WebP to Supabase Storage using the service role
    // (bucket policy restricts direct client writes to admin/staff already,
    // but the API route is the enforced choke point for size/type limits).
    const storage = createServiceRoleClient();
    const path = `ai-imports/${user.id}/${Date.now()}-${nanoid(8)}.webp`;
    const { error: uploadError } = await storage.storage
      .from("product-images")
      .upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });

    if (uploadError) {
      console.error("[ai/extract-product] upload failed:", uploadError);
      return Response.json({ error: "Image upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = storage.storage.from("product-images").getPublicUrl(path);

    const extraction = await extractProductsFromImage({ imageUrl: publicUrl });

    // Stage each detected product as a draft for admin review — AI never
    // publishes directly, per the requirement that admins review/edit first.
    const supabase = await createClient();
    const { data: drafts, error: draftError } = await supabase
      .from("ai_import_drafts")
      .insert(
        extraction.products.map((p) => ({
          source_image_url: publicUrl,
          extracted: p,
          confidence: p.confidence,
          status: "pending_review" as const,
        }))
      )
      .select("id, extracted, confidence, source_image_url");

    if (draftError) {
      console.error("[ai/extract-product] draft insert failed:", draftError);
      return Response.json({ error: "Failed to save AI draft" }, { status: 500 });
    }

    await logAudit({
      actorId: user.id,
      action: "ai_import.extract",
      entityType: "ai_import_draft",
      metadata: { count: drafts.length, imageBytes: processed.bytes },
    });

    return Response.json(
      { drafts, imageUrl: publicUrl, rateLimitRemaining: remaining },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("GROQ_API_KEY")) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    return rbacErrorResponse(err);
  }
}
