import { safeFetchHtml } from "./fetch";
import { extractJsonLd } from "./extractors/json-ld";
import { extractOpenGraph } from "./extractors/open-graph";
import { extractMicrodata } from "./extractors/microdata";
import { loadHtml, cleanedVisibleText, resolveImageUrls } from "./sanitize";
import { toCrawlResult } from "./normalize";
import { extractProductFromText } from "@/lib/ai/text-extract";
import type { CrawlResult, TierResult } from "./types";

export type { CrawlResult } from "./types";

/**
 * Runs the tiered extraction pipeline for a single product URL:
 *   1. JSON-LD  2. OpenGraph  3. Microdata  4. (AI extraction, only if needed)
 *
 * Tier 6 (headless browser render for JS-only SPAs) and tier 7 (screenshot
 * OCR) are deliberately not implemented in this slice — this stack runs on
 * Vercel serverless functions with a 30s budget and no browser binary
 * available, per the project's existing constraints (see README "Vercel
 * free-tier cost notes"). Adding them later means implementing
 * `Extractor`-shaped modules here and slotting them into the `tiers` array
 * below; nothing else in this file needs to change.
 */
export async function crawlProductUrl(url: string): Promise<CrawlResult> {
  const page = await safeFetchHtml(url);
  const $ = loadHtml(page.html);

  const tierResults: TierResult[] = [];

  const jsonLd = extractJsonLd($, page.finalUrl);
  if (jsonLd) tierResults.push({ tier: "json-ld", data: jsonLd });

  const og = extractOpenGraph($);
  if (og) tierResults.push({ tier: "open-graph", data: og });

  const microdata = extractMicrodata($);
  if (microdata) tierResults.push({ tier: "microdata", data: microdata });

  // Resolve relative image URLs against the final (post-redirect) page URL,
  // before we compute a preliminary merge to decide whether AI is needed.
  for (const r of tierResults) {
    if (r.data.images?.length) r.data.images = resolveImageUrls(r.data.images, page.finalUrl);
  }

  let preliminary = toCrawlResult(tierResults);
  const missingCritical = !preliminary.data.title || typeof preliminary.data.price !== "number";

  if (missingCritical && process.env.GROQ_API_KEY) {
    try {
      const text = cleanedVisibleText($);
      const aiResult = await extractProductFromText({
        cleanedText: text,
        url: page.finalUrl,
        partial: preliminary.data,
      });
      tierResults.push({
        tier: "ai-extraction",
        data: {
          ...aiResult,
          brand: aiResult.brand ?? undefined,
          sku: aiResult.sku ?? undefined,
          currency: aiResult.currency ?? undefined,
          price: aiResult.price ?? undefined,
        },
      });
      preliminary = toCrawlResult(tierResults);
    } catch (err) {
      // AI is a fallback, not a hard dependency — surface the failure as a
      // warning rather than failing the whole import (graceful degradation,
      // per the "never stop entire import" requirement).
      preliminary.warnings.push(
        `AI extraction fallback failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  } else if (missingCritical && !process.env.GROQ_API_KEY) {
    preliminary.warnings.push("AI extraction fallback is unavailable (GROQ_API_KEY not configured).");
  }

  return preliminary;
}
