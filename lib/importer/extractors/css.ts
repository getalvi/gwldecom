import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";

// Platform-specific CSS selectors — add new platforms here
const SITE_SELECTORS: Record<string, {
  title?: string[]; price?: string[]; description?: string[]; image?: string[]; brand?: string[]; sku?: string[];
}> = {
  amazon: {
    title: ["#productTitle", "#title", "h1.product-title-word-break"],
    price: ["#priceblock_ourprice", ".a-price .a-offscreen", "#price_inside_buybox", "#apex_offerDisplay_desktop .a-price .a-offscreen"],
    description: ["#feature-bullets", "#productDescription", "#bookDescription_feature_div"],
    image: ["#landingImage", "#imgBlkFront", ".a-dynamic-image"],
    brand: ["#bylineInfo", ".po-brand .po-break-word"],
    sku: ["#ASIN", 'input[name="ASIN"]'],
  },
  aliexpress: {
    title: [".product-title-text", "h1.product-name", ".pdp-info-main .pdp-product-title"],
    price: [".product-price-value", ".uniform-banner-box-price", ".pdp-price .pdp-price-current"],
    image: [".magnifier-image", ".slider-item img", ".images-view-item img"],
    brand: [".product-property-item .property-title + span"],
  },
  daraz: {
    title: [".pdp-product-title", "h1.title", ".product-title"],
    price: [".pdp-price", ".pdp-modified-price .pdp-price"],
    image: [".gallery-preview-panel img", ".pdp-image img"],
    brand: [".pdp-product-brand a"],
    description: [".pdp-product-desc", ".html-content"],
  },
  shopify: {
    title: [".product__title", ".product-title", "h1.product_name", ".product-single__title"],
    price: [".product__price .money", ".price__current", ".product-price .money"],
    image: [".product__media img", ".product-featured-media img", ".product-single__media img"],
    description: [".product__description", ".product-description"],
    brand: [".product__vendor", ".vendor"],
  },
  woocommerce: {
    title: [".product_title", "h1.product_title"],
    price: [".price .woocommerce-Price-amount bdi", ".price ins .amount"],
    image: [".woocommerce-product-gallery__image img"],
    description: [".woocommerce-product-details__short-description", "#tab-description"],
    sku: [".sku"],
    brand: [".product_meta .posted_in"],
  },
  ebay: {
    title: ["h1.x-item-title__mainTitle span", "#itemTitle", ".x-item-title .ux-textspans"],
    price: [".x-price-primary .ux-textspans", "#prcIsum", "#mm-saleDscPrc"],
    image: ["#icImg", ".ux-image-carousel-item img"],
    description: [".x-item-description", "#ds_div"],
    brand: [".ux-labels-values__values-content span"],
    sku: [".ux-labels-values__values-content .ux-textspans"],
  },
};

function detectPlatform(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("amazon.")) return "amazon";
  if (u.includes("aliexpress.")) return "aliexpress";
  if (u.includes("daraz.")) return "daraz";
  if (u.includes("ebay.")) return "ebay";
  // Detect Shopify by meta tag (checked in HTML)
  return null;
}

function extractText(html: string, selectors: string[]): string {
  for (const sel of selectors) {
    // Simple attribute-based extraction from raw HTML (no DOM parser on server)
    const tag = sel.replace(/[.#\[\]="0-9]/g, " ").trim().split(" ")[0] ?? "div";
    const classMatch = sel.match(/\.([a-zA-Z_-]+)/);
    const idMatch = sel.match(/#([a-zA-Z_-]+)/);

    let pattern: RegExp | null = null;
    if (idMatch) {
      pattern = new RegExp(`id=["']${idMatch[1]}["'][^>]*>([^<]{3,500})`, "i");
    } else if (classMatch) {
      pattern = new RegExp(`class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*>([^<]{3,500})`, "i");
    }
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
    const matches = [...html.matchAll(pattern)];
    for (const m of matches) if (m[1]) results.push(m[1]);
  }
  return [...new Set(results)];
}

export class CssExtractor implements IExtractor {
  name: ExtractionMethod = "css";
  priority = 4;

  canExtract(html: string, url: string): boolean {
    return !!detectPlatform(url) ||
      html.includes("woocommerce") ||
      html.includes("shopify") ||
      html.includes("Shopify.theme");
  }

  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    let platform = detectPlatform(url);
    if (!platform) {
      if (html.includes("woocommerce")) platform = "woocommerce";
      else if (html.includes("shopify") || html.includes("Shopify.theme")) platform = "shopify";
    }
    if (!platform) return {};

    const sel = SITE_SELECTORS[platform];
    if (!sel) return {};

    const title = sel.title ? extractText(html, sel.title) : "";
    if (!title) return {};

    const priceStr = sel.price ? extractText(html, sel.price) : "";
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
    const images = sel.image ? extractSrc(html, sel.image) : [];

    return {
      title,
      description: sel.description ? extractText(html, sel.description) : "",
      price,
      currency: "BDT",
      images,
      brand: sel.brand ? extractText(html, sel.brand) : "",
      sku: sel.sku ? extractText(html, sel.sku) : "",
      variants: [],
      specifications: {},
      attributes: {},
      tags: [],
      warnings: [`Extracted via CSS selectors (${platform})`],
      sourceUrl: url,
      extractionMethod: "css",
      confidence: 0.7,
    };
  }
}
