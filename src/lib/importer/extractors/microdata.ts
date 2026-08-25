import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";
export class MicrodataExtractor implements IExtractor {
  name: ExtractionMethod = "microdata"; priority = 3;
  canExtract(html: string): boolean { return html.includes('itemtype="http://schema.org/Product"') || html.includes('itemtype="https://schema.org/Product"'); }
  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const getProp = (prop: string) => (html.match(new RegExp(`itemprop=["']${prop}["'][^>]*(?:content|value)=["']([^"']+)["']`, "i")) ?? html.match(new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]+)<`, "i")))?.[1]?.trim() ?? "";
    const title = getProp("name"); if (!title) return {};
    const price = parseFloat((getProp("price") || "0").replace(/[^0-9.]/g, "")) || 0;
    const imageMatches = [...html.matchAll(/itemprop=["']image["'][^>]*(?:src|content)=["']([^"']+)["']/gi)];
    return { title, description: getProp("description"), price, currency: getProp("priceCurrency") || "BDT", images: imageMatches.map(m => m[1]).filter(Boolean) as string[], brand: getProp("brand"), sku: getProp("sku"), variants: [], specifications: {}, attributes: {}, tags: [], warnings: [], sourceUrl: url, extractionMethod: "microdata", confidence: 0.75 };
  }
}
