import "server-only";
import { aiExtractionSchema, type AIExtraction } from "./schema";

// Migrated to OpenRouter — uses OP_API_KEY env var
// OpenRouter provides access to vision-capable models with an OpenAI-compatible API
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a meticulous e-commerce product cataloguer for a Bangladeshi
online marketplace (like Daraz.com.bd). You will be shown an image that may be a photo of a
product, a screenshot of a product listing, or a screenshot of an entire webpage.

Identify every distinct sellable product visible. For each one extract:
- title: concise customer-facing product name
- description: 2-4 marketing sentences, factual only
- category: single general category e.g. "Electronics > Mobile Phones"
- estimatedPriceBDT: best-effort price in Bangladeshi Taka, or null
- specifications: flat string key-value pairs (brand, model, material, color, etc.)
- attributes: variant options e.g. {"color": ["Black","Blue"]}
- tags: 5-10 relevant search keywords
- confidence: 0-1 confidence score

Respond with ONLY valid JSON, no markdown, no commentary:
{"products":[{"title":"","description":"","category":"","estimatedPriceBDT":0,"specifications":{},"attributes":{},"tags":[],"confidence":0.8}]}`;

interface ExtractOptions {
  imageUrl: string;
}

export async function extractProductsFromImage({ imageUrl }: ExtractOptions): Promise<AIExtraction> {
  const apiKey = process.env.OP_API_KEY;
  if (!apiKey) {
    throw new Error("OP_API_KEY is not configured. Add your OpenRouter API key in Vercel environment variables.");
  }

  // Use a vision-capable model available on OpenRouter
  const model = process.env.OPENROUTER_MODEL || "google/gemini-flash-1.5";

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://localhost:3000",
      "X-Title": "ShopBD AI Import",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all sellable products from this image as JSON." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter VLM request failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("VLM returned no content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("VLM returned malformed JSON");
  }

  const result = aiExtractionSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[vlm] Schema validation failed:", result.error.flatten());
    throw new Error("VLM output did not match expected schema");
  }

  return result.data;
}

export async function enrichWithWebSearch(title: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const engineId = process.env.GOOGLE_CSE_ENGINE_ID;
  if (!apiKey || !engineId) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", engineId);
  url.searchParams.set("q", `${title} price specifications`);
  url.searchParams.set("num", "5");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: { snippet?: string }) => item.snippet).filter(Boolean);
  } catch (err) {
    console.error("[web-search] enrichment failed:", err);
    return [];
  }
}
