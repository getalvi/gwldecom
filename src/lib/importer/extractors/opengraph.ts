import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";
export class OpenGraphExtractor implements IExtractor {
  name: ExtractionMethod = "opengraph"; priority = 2;
  canExtract(html: string): boolean { return html.includes("og:title") || html.includes("og:price"); }
  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const get = (prop: string) => (html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i")) ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, "i")))?.[1]?.trim() ?? "";
    const title = get("og:title");
    if (!title) return {};
    const priceStr = get("og:price:amount") || get("product:price:amount");
    return { title, description: get("og:description"), price: parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0, currency: get("og:price:currency") || "BDT", images: get("og:image") ? [get("og:image")] : [], brand: get("og:brand"), sku: get("product:retailer_item_id"), variants: [], specifications: {}, attributes: {}, tags: [], warnings: ["Partial — OpenGraph only"], sourceUrl: url, extractionMethod: "opengraph", confidence: 0.6 };
  }
}
