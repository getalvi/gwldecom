import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";
export class JsonLdExtractor implements IExtractor {
  name: ExtractionMethod = "jsonld"; priority = 1;
  canExtract(html: string): boolean { return html.includes('"@type"') && (html.includes('"Product"') || html.includes('"Offer"')); }
  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of scripts) {
      try {
        const data = JSON.parse(match[1]?.trim() ?? "");
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (!["Product","IndividualProduct"].includes(item["@type"])) continue;
          const offer = item.offers?.offers?.[0] ?? item.offers?.[0] ?? item.offers ?? {};
          const imgs = Array.isArray(item.image) ? item.image : item.image ? [item.image] : [];
          const images = imgs.map((u: unknown) => typeof u === "string" ? u : (u as Record<string,string>)?.url ?? "").filter(Boolean);
          const price = parseFloat(String(offer.price ?? item.price ?? 0).replace(/[^0-9.]/g, "")) || 0;
          return { title: item.name ?? "", description: item.description ?? "", price, currency: offer.priceCurrency ?? "BDT", stock: offer.availability?.includes("InStock") ? 99 : 0, sku: item.sku ?? "", brand: item.brand?.name ?? item.brand ?? "", images, rating: item.aggregateRating?.ratingValue ? parseFloat(item.aggregateRating.ratingValue) : undefined, reviewCount: item.aggregateRating?.reviewCount ? parseInt(item.aggregateRating.reviewCount) : undefined, category: item.category ?? "", variants: [], specifications: {}, attributes: {}, tags: [], warnings: [], sourceUrl: url, extractionMethod: "jsonld", confidence: 0.92 };
        }
      } catch { }
    }
    return {};
  }
}
