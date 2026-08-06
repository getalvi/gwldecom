import type { CrawlResult, ExtractionTier, RawExtraction, TierResult } from "./types";

const TIER_PRIORITY: ExtractionTier[] = ["json-ld", "open-graph", "microdata", "ai-extraction"];

/**
 * Merges tiers highest-priority-first: a field already filled by a
 * higher-priority tier is never overwritten by a lower one — lower tiers
 * only fill in the gaps. This is what lets us layer AI extraction on top
 * of structured data instead of replacing it.
 */
export function mergeTiers(results: TierResult[]): { data: RawExtraction; tiersUsed: ExtractionTier[] } {
  const ordered = [...results].sort((a, b) => TIER_PRIORITY.indexOf(a.tier) - TIER_PRIORITY.indexOf(b.tier));

  const merged: RawExtraction = {};
  const tiersUsed: ExtractionTier[] = [];

  for (const { tier, data } of ordered) {
    let usedSomething = false;

    for (const key of Object.keys(data) as (keyof RawExtraction)[]) {
      const value = data[key];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && value.length === 0) continue;

      if (merged[key] === undefined) {
        // TS can't correlate the key with the value's exact union member here.
        (merged as Record<string, unknown>)[key] = value;
        usedSomething = true;
      } else if (Array.isArray(merged[key]) && Array.isArray(value)) {
        // Union arrays (images, tags) across tiers instead of dropping the rest.
        const combined = Array.from(new Set([...(merged[key] as unknown[]), ...(value as unknown[])]));
        (merged as Record<string, unknown>)[key] = combined;
        usedSomething = true;
      }
    }

    if (usedSomething) tiersUsed.push(tier);
  }

  return { data: merged, tiersUsed };
}

/**
 * 0-1 confidence score. Weighted toward the fields that actually matter for
 * a usable product listing (title + price), with a small bonus for having
 * come from structured data rather than only the AI-extraction tier.
 */
export function scoreConfidence(data: RawExtraction, tiersUsed: ExtractionTier[]): number {
  let score = 0;
  if (data.title) score += 0.3;
  if (typeof data.price === "number") score += 0.25;
  if (data.images && data.images.length > 0) score += 0.15;
  if (data.description) score += 0.1;
  if (data.category) score += 0.05;
  if (data.brand) score += 0.05;
  if (data.sku) score += 0.05;
  if (data.specifications && Object.keys(data.specifications).length > 0) score += 0.05;

  const structuredOnly = tiersUsed.some((t) => t === "json-ld" || t === "microdata");
  if (structuredOnly) score += 0.05;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function buildWarnings(data: RawExtraction): string[] {
  const warnings: string[] = [];
  if (!data.title) warnings.push("No title found — please fill this in manually before approving.");
  if (typeof data.price !== "number") warnings.push("No price detected — set a price before approving.");
  if (!data.images || data.images.length === 0) warnings.push("No product images found on the page.");
  if (!data.description) warnings.push("No description found.");
  return warnings;
}

export function toCrawlResult(results: TierResult[]): CrawlResult {
  const { data, tiersUsed } = mergeTiers(results);

  const normalized: CrawlResult["data"] = {
    title: data.title ?? "",
    description: data.description ?? "",
    category: data.category ?? "Uncategorized",
    images: data.images ?? [],
    specifications: data.specifications ?? {},
    attributes: data.attributes ?? {},
    tags: data.tags ?? [],
    brand: data.brand,
    sku: data.sku,
    price: data.price,
    currency: data.currency,
    availability: data.availability,
    ratingValue: data.ratingValue,
    ratingCount: data.ratingCount,
    breadcrumb: data.breadcrumb,
  };

  return {
    data: normalized,
    tiersUsed,
    confidence: scoreConfidence(data, tiersUsed),
    warnings: buildWarnings(data),
  };
}
