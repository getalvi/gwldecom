import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";

export class JsonLdExtractor implements IExtractor {
  name: ExtractionMethod = "jsonld";
  priority = 1;

  canExtract(html: string): boolean {
    return html.includes('"@type"') && (
      html.includes('"Product"') || html.includes('"ItemPage"') || html.includes('"Offer"')
    );
  }

  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    const products: Partial<ExtractedProduct>[] = [];

    for (const match of scripts) {
      try {
        const raw = match[1]?.trim() ?? "";
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];

        for (const item of items) {
          if (!["Product", "IndividualProduct"].includes(item["@type"])) continue;
          const offer = item.offers?.offers?.[0] ?? item.offers?.[0] ?? item.offers ?? {};
          const images = this.extractImages(item.image);
          const price = parseFloat(String(offer.price ?? item.price ?? 0).replace(/[^0-9.]/g, "")) || 0;

          products.push({
            title: item.name ?? "",
            description: item.description ?? "",
            price,
            currency: offer.priceCurrency ?? "BDT",
            stock: offer.availability?.includes("InStock") ? 99 : 0,
            sku: item.sku ?? offer.sku ?? "",
            barcode: item.gtin ?? item.gtin13 ?? item.gtin8 ?? item.mpn ?? "",
            brand: item.brand?.name ?? item.brand ?? "",
            images,
            rating: item.aggregateRating?.ratingValue ? parseFloat(item.aggregateRating.ratingValue) : undefined,
            reviewCount: item.aggregateRating?.reviewCount ? parseInt(item.aggregateRating.reviewCount) : undefined,
            weight: item.weight?.value ?? "",
            category: item.category ?? "",
            variants: [],
            specifications: {},
            attributes: {},
            tags: [],
            warnings: [],
            sourceUrl: url,
            extractionMethod: "jsonld",
            confidence: 0.92,
          });
        }
      } catch { /* malformed JSON-LD, skip */ }
    }

    return products[0] ?? {};
  }

  private extractImages(raw: unknown): string[] {
    if (!raw) return [];
    const urls = Array.isArray(raw) ? raw : [raw];
    return urls.map(u => (typeof u === "string" ? u : (u as Record<string, string>)?.url ?? "")).filter(Boolean);
  }
}
