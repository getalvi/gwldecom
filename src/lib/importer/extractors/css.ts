import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";
const SELECTORS: Record<string, { title?: string[]; price?: string[]; image?: string[]; description?: string[]; brand?: string[]; sku?: string[] }> = {
  amazon: { title: ["#productTitle","#title"], price: ["#priceblock_ourprice",".a-price .a-offscreen","#apex_offerDisplay_desktop .a-price .a-offscreen"], image: ["#landingImage","#imgBlkFront"], description: ["#feature-bullets"], brand: ["#bylineInfo"], sku: ["#ASIN"] },
  aliexpress: { title: [".product-title-text","h1.product-name"], price: [".product-price-value",".uniform-banner-box-price"], image: [".magnifier-image",".slider-item img"] },
  daraz: { title: [".pdp-product-title","h1.title"], price: [".pdp-price"], image: [".gallery-preview-panel img"], description: [".pdp-product-desc"] },
  shopify: { title: [".product__title",".product-title","h1.product_name"], price: [".product__price .money",".price__current"], image: [".product__media img"], description: [".product__description"] },
  woocommerce: { title: [".product_title","h1.product_title"], price: [".price .woocommerce-Price-amount bdi"], image: [".woocommerce-product-gallery__image img"], description: [".woocommerce-product-details__short-description"], sku: [".sku"] },
  ebay: { title: ["h1.x-item-title__mainTitle span","#itemTitle"], price: [".x-price-primary .ux-textspans","#prcIsum"], image: ["#icImg",".ux-image-carousel-item img"] },
};
function detectPlatform(url: string, html: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("amazon.")) return "amazon";
  if (u.includes("aliexpress.")) return "aliexpress";
  if (u.includes("daraz.")) return "daraz";
  if (u.includes("ebay.")) return "ebay";
  if (html.includes("woocommerce")) return "woocommerce";
  if (html.includes("Shopify.theme") || html.includes("shopify")) return "shopify";
  return null;
}
function extractText(html: string, selectors: string[]): string {
  for (const sel of selectors) {
    const classMatch = sel.match(/\.([a-zA-Z_-]+)/);
    const idMatch = sel.match(/#([a-zA-Z_-]+)/);
    let pattern: RegExp | null = null;
    if (idMatch) pattern = new RegExp(`id=["']${idMatch[1]}["'][^>]*>([^<]{3,500})`, "i");
    else if (classMatch) pattern = new RegExp(`class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*>([^<]{3,500})`, "i");
    if (!pattern) continue;
    const m = html.match(pattern);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, " ");
  }
  return "";
}
function extractSrc(html: string, selectors: string[]): string[] {
  const results: string[] = [];
  for (const sel of selectors) {
    const classMatch = sel.match(/\.([a-zA-Z_-]+)/);
    const idMatch = sel.match(/#([a-zA-Z_-]+)/);
    let pattern: RegExp | null = null;
    if (idMatch) pattern = new RegExp(`id=["']${idMatch[1]}["'][^>]*src=["']([^"']+)["']`, "gi");
    else if (classMatch) pattern = new RegExp(`class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*src=["']([^"']+)["']`, "gi");
    if (!pattern) continue;
    for (const m of [...html.matchAll(pattern)]) if (m[1]) results.push(m[1]);
  }
  return [...new Set(results)];
}
export class CssExtractor implements IExtractor {
  name: ExtractionMethod = "css"; priority = 4;
  canExtract(html: string, url: string): boolean { return !!detectPlatform(url, html); }
  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const platform = detectPlatform(url, html); if (!platform) return {};
    const sel = SELECTORS[platform]; if (!sel) return {};
    const title = sel.title ? extractText(html, sel.title) : ""; if (!title) return {};
    const priceStr = sel.price ? extractText(html, sel.price) : "";
    return { title, description: sel.description ? extractText(html, sel.description) : "", price: parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0, currency: "BDT", images: sel.image ? extractSrc(html, sel.image) : [], brand: sel.brand ? extractText(html, sel.brand) : "", sku: sel.sku ? extractText(html, sel.sku) : "", variants: [], specifications: {}, attributes: {}, tags: [], warnings: [`Extracted via CSS (${platform})`], sourceUrl: url, extractionMethod: "css", confidence: 0.7 };
  }
}
