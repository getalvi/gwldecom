import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";

export class MicrodataExtractor implements IExtractor {
  name: ExtractionMethod = "microdata";
  priority = 3;

  canExtract(html: string): boolean {
    return html.includes('itemtype="http://schema.org/Product"') ||
           html.includes("itemtype='http://schema.org/Product'") ||
           html.includes("itemtype=\"https://schema.org/Product\"");
  }

  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const getProp = (prop: string): string => {
      const m = html.match(new RegExp(`itemprop=["']${prop}["'][^>]*(?:content|value)=["']([^"']+)["']`, "i"))
               ?? html.match(new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]+)<`, "i"));
      return m?.[1]?.trim() ?? "";
    };

    const title = getProp("name");
    if (!title) return {};

    const priceStr = getProp("price") || getProp("lowPrice");
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;

    const imageMatches = [...html.matchAll(/itemprop=["']image["'][^>]*(?:src|content)=["']([^"']+)["']/gi)];
    const images = imageMatches.map(m => m[1]).filter(Boolean) as string[];

    return {
      title,
      description: getProp("description"),
      price,
      currency: getProp("priceCurrency") || "BDT",
      images,
      brand: getProp("brand"),
      sku: getProp("sku") || getProp("productID"),
      rating: parseFloat(getProp("ratingValue")) || undefined,
      reviewCount: parseInt(getProp("reviewCount")) || undefined,
      variants: [],
      specifications: {},
      attributes: {},
      tags: [],
      warnings: [],
      sourceUrl: url,
      extractionMethod: "microdata",
      confidence: 0.75,
    };
  }
}
