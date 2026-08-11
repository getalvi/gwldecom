import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";

export class OpenGraphExtractor implements IExtractor {
  name: ExtractionMethod = "opengraph";
  priority = 2;

  canExtract(html: string): boolean {
    return html.includes('og:title') || html.includes('og:price');
  }

  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const get = (prop: string): string => {
      const m = html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i"))
               ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const title = get("og:title");
    if (!title) return {};

    const priceStr = get("og:price:amount") || get("product:price:amount") || get("og:price");
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
    const image = get("og:image");

    return {
      title,
      description: get("og:description"),
      price,
      currency: get("og:price:currency") || get("product:price:currency") || "BDT",
      images: image ? [image] : [],
      brand: get("og:brand") || get("product:brand"),
      category: get("og:type") === "product" ? get("product:category") : "",
      sku: get("product:retailer_item_id") || get("og:sku"),
      variants: [],
      specifications: {},
      attributes: {},
      tags: [],
      warnings: ["Partial data — only OpenGraph tags found"],
      sourceUrl: url,
      extractionMethod: "opengraph",
      confidence: 0.6,
    };
  }
}
