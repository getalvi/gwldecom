import "server-only";
import type { IExtractor, ExtractedProduct, ExtractionMethod } from "../interfaces";

const SYSTEM_PROMPT = `You are an expert ecommerce product data extractor. Extract ALL product info from this page content into JSON.
Respond ONLY with valid JSON (no markdown):
{"title":"","description":"","price":0,"compareAtPrice":null,"currency":"BDT","stock":null,"sku":"","barcode":"","brand":"","category":"","breadcrumb":[],"images":[],"variants":[],"specifications":{},"attributes":{},"tags":[],"rating":null,"reviewCount":null,"weight":"","dimensions":"","warranty":"","shipping":"","seller":"","confidence":0.8,"warnings":[]}`;

function cleanHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<nav[\s\S]*?<\/nav>/gi,"").replace(/<footer[\s\S]*?<\/footer>/gi,"").replace(/<header[\s\S]*?<\/header>/gi,"").replace(/<!--[\s\S]*?-->/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim().slice(0,12000);
}

export class AiExtractor implements IExtractor {
  name: ExtractionMethod = "ai"; priority = 5;
  canExtract(html: string): boolean { return html.length > 500; }
  async extract(html: string, url: string): Promise<Partial<ExtractedProduct>> {
    const apiKey = process.env.OP_API_KEY;
    if (!apiKey) return { warnings: ["OP_API_KEY not configured"], sourceUrl: url, extractionMethod: "ai", confidence: 0 };
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000", "X-Title": "ShopBD AI Importer" },
        body: JSON.stringify({ model: process.env.OPENROUTER_TEXT_MODEL ?? "google/gemini-flash-1.5", temperature: 0.1, max_tokens: 2000, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `URL: ${url}\n\nContent:\n${cleanHtml(html)}` }] }),
      });
      if (!res.ok) return { warnings: [`AI error ${res.status}`], sourceUrl: url, extractionMethod: "ai", confidence: 0 };
      const data = await res.json();
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
      return {
        title: String(parsed.title ?? ""), description: String(parsed.description ?? ""), price: Number(parsed.price ?? 0),
        compareAtPrice: parsed.compareAtPrice ? Number(parsed.compareAtPrice) : undefined, currency: String(parsed.currency ?? "BDT"),
        stock: parsed.stock !== null && parsed.stock !== undefined ? Number(parsed.stock) : undefined,
        sku: String(parsed.sku ?? ""), barcode: String(parsed.barcode ?? ""), brand: String(parsed.brand ?? ""),
        category: String(parsed.category ?? ""), breadcrumb: Array.isArray(parsed.breadcrumb) ? parsed.breadcrumb.map(String) : [],
        images: Array.isArray(parsed.images) ? parsed.images.map(String).filter(Boolean) : [],
        variants: Array.isArray(parsed.variants) ? parsed.variants as [] : [],
        specifications: (parsed.specifications && typeof parsed.specifications === "object" && !Array.isArray(parsed.specifications)) ? Object.fromEntries(Object.entries(parsed.specifications as Record<string,unknown>).map(([k,v]) => [k, String(v)])) : {},
        attributes: (parsed.attributes && typeof parsed.attributes === "object" && !Array.isArray(parsed.attributes)) ? Object.fromEntries(Object.entries(parsed.attributes as Record<string,unknown>).map(([k,v]) => [k, Array.isArray(v) ? v.map(String) : []])) : {},
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
        rating: parsed.rating ? Number(parsed.rating) : undefined, reviewCount: parsed.reviewCount ? Number(parsed.reviewCount) : undefined,
        weight: String(parsed.weight ?? ""), dimensions: String(parsed.dimensions ?? ""), warranty: String(parsed.warranty ?? ""),
        shipping: String(parsed.shipping ?? ""), seller: String(parsed.seller ?? ""),
        confidence: Number(parsed.confidence ?? 0.7), warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
        sourceUrl: url, extractionMethod: "ai",
      };
    } catch (err) {
      return { warnings: [`AI failed: ${err instanceof Error ? err.message : String(err)}`], sourceUrl: url, extractionMethod: "ai", confidence: 0 };
    }
  }
  async rewriteForSeo(product: Partial<ExtractedProduct>): Promise<{ title: string; description: string; tags: string[] }> {
    const apiKey = process.env.OP_API_KEY;
    if (!apiKey) return { title: product.title ?? "", description: product.description ?? "", tags: product.tags ?? [] };
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENROUTER_TEXT_MODEL ?? "google/gemini-flash-1.5", temperature: 0.4, max_tokens: 800, response_format: { type: "json_object" }, messages: [{ role: "user", content: `Rewrite for SEO, respond JSON {"title":"","description":"","tags":[]}\n\n${JSON.stringify({ title: product.title, description: product.description?.slice(0, 500), category: product.category })}` }] }) });
      const data = await res.json();
      const p = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      return { title: p.title ?? product.title ?? "", description: p.description ?? product.description ?? "", tags: p.tags ?? product.tags ?? [] };
    } catch { return { title: product.title ?? "", description: product.description ?? "", tags: product.tags ?? [] }; }
  }
  async translate(product: Partial<ExtractedProduct>, targetLang: string): Promise<{ title: string; description: string }> {
    const apiKey = process.env.OP_API_KEY;
    if (!apiKey) return { title: product.title ?? "", description: product.description ?? "" };
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENROUTER_TEXT_MODEL ?? "google/gemini-flash-1.5", temperature: 0.2, max_tokens: 1000, response_format: { type: "json_object" }, messages: [{ role: "user", content: `Translate to ${targetLang}, respond JSON {"title":"","description":""}\n\nTitle: ${product.title}\nDescription: ${product.description?.slice(0, 500)}` }] }) });
      const data = await res.json();
      const p = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      return { title: p.title ?? product.title ?? "", description: p.description ?? product.description ?? "" };
    } catch { return { title: product.title ?? "", description: product.description ?? "" }; }
  }
}
