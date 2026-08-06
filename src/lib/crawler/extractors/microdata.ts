import type { CheerioAPI } from "cheerio";
import type { RawExtraction } from "../types";

function itemPropText($: CheerioAPI, prop: string): string | undefined {
  const el = $(`[itemprop="${prop}"]`).first();
  if (!el.length) return undefined;
  const content = el.attr("content");
  if (content) return content.trim();
  const src = el.attr("src") ?? el.attr("href");
  if (src) return src.trim();
  const text = el.text().trim();
  return text || undefined;
}

function itemPropAll($: CheerioAPI, prop: string): string[] {
  const out: string[] = [];
  $(`[itemprop="${prop}"]`).each((_, el) => {
    const node = $(el);
    const val = node.attr("content") ?? node.attr("src") ?? node.text().trim();
    if (val) out.push(val.trim());
  });
  return out;
}

/**
 * Best-effort schema.org Microdata reader. This is intentionally simple
 * (doesn't track nested itemscope boundaries), which is fine as a tier-3
 * fallback — tier 1 (JSON-LD) is far more common and far more reliable on
 * modern storefronts.
 */
export function extractMicrodata($: CheerioAPI): RawExtraction | null {
  const hasProductScope = $('[itemtype*="schema.org/Product"]').length > 0;
  if (!hasProductScope) return null;

  const title = itemPropText($, "name");
  const description = itemPropText($, "description");
  const priceRaw = itemPropText($, "price");
  const currency = itemPropText($, "priceCurrency");
  const brand = itemPropText($, "brand");
  const sku = itemPropText($, "sku");
  const images = itemPropAll($, "image");
  const availabilityRaw = itemPropText($, "availability");

  if (!title) return null;

  return {
    title,
    description,
    brand,
    sku,
    price: priceRaw ? Number(priceRaw) || undefined : undefined,
    currency,
    images: images.length ? images : undefined,
    availability: availabilityRaw?.toLowerCase().includes("instock")
      ? "in_stock"
      : availabilityRaw?.toLowerCase().includes("outofstock")
        ? "out_of_stock"
        : undefined,
  };
}
