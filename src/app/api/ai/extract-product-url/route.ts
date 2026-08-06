import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, rbacErrorResponse } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/rateLimit";
import { crawlProductUrl } from "@/lib/crawler";
import { logAudit } from "@/lib/audit";

// The SSRF guard in lib/crawler/fetch.ts does a real DNS lookup, which
// requires the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const maxDuration = 30; // seconds — same free-tier ceiling as extract-product

const bodySchema = z.object({ url: z.string().trim().url() });

/**
 * POST /api/ai/extract-product-url
 * JSON body: { "url": "https://example.com/product/123" }
 *
 * Flow: staff/admin pastes a product URL -> tiered crawler (JSON-LD ->
 * OpenGraph -> Microdata -> AI text-extraction fallback) -> validated,
 * normalized product data -> staged as an ai_import_drafts row for the same
 * human-in-the-loop review/approve flow the image pipeline already uses.
 * This route never writes to `products` directly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["admin", "staff"]);

    const { success, remaining } = await checkRateLimit(`user:${user.id}`, "ai-import-url", 15, 60);
    if (!success) {
      return Response.json({ error: "Import rate limit exceeded, try again shortly" }, { status: 429 });
    }

    const { url } = bodySchema.parse(await request.json());

    const supabase = await createClient();

    // Duplicate-import guard: if this exact URL already has a pending
    // draft, hand that back instead of crawling again and creating a
    // near-duplicate row (basic version of the spec's "duplicate detection"
    // requirement; SKU/image-hash dedupe against published products is a
    // reasonable next step once category/brand mapping lands).
    const { data: existing } = await supabase
      .from("ai_import_drafts")
      .select("id, extracted, confidence, source_image_url, source_url")
      .eq("source_url", url)
      .eq("status", "pending_review")
      .maybeSingle();

    if (existing) {
      return Response.json(
        { draft: existing, tiersUsed: [], warnings: ["A pending draft for this URL already exists."], deduped: true },
        { status: 200 }
      );
    }

    const result = await crawlProductUrl(url);

    const { data: draft, error: draftError } = await supabase
      .from("ai_import_drafts")
      .insert({
        source_url: url,
        source_type: "url",
        source_image_url: result.data.images[0] ?? null,
        extracted: result.data,
        confidence: result.confidence,
        status: "pending_review",
      })
      .select("id, extracted, confidence, source_image_url, source_url")
      .single();

    if (draftError) {
      console.error("[ai/extract-product-url] draft insert failed:", draftError);
      return Response.json({ error: "Failed to save import draft" }, { status: 500 });
    }

    await logAudit({
      actorId: user.id,
      action: "ai_import.extract_url",
      entityType: "ai_import_draft",
      entityId: draft.id,
      metadata: { url, tiersUsed: result.tiersUsed, warnings: result.warnings },
    });

    return Response.json(
      { draft, tiersUsed: result.tiersUsed, warnings: result.warnings, rateLimitRemaining: remaining },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "A valid product URL is required" }, { status: 400 });
    }
    if (err instanceof Error && err.message.startsWith("BLOCKED_URL")) {
      return Response.json({ error: "This URL can't be imported (blocked or unresolvable host)" }, { status: 400 });
    }
    if (err instanceof Error && err.message.startsWith("GROQ_API_KEY")) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof Error && /Upstream returned|exceeded max size|Unsupported content-type/.test(err.message)) {
      return Response.json({ error: `Could not fetch the page: ${err.message}` }, { status: 502 });
    }
    return rbacErrorResponse(err);
  }
}
