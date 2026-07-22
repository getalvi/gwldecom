import "server-only";
import { aiExtractionSchema, type AIExtraction } from "./schema";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a meticulous e-commerce product cataloguer for a Bangladeshi
online marketplace (like Daraz.com.bd). You will be shown an image that may be a photo of a
product, a screenshot of a product listing, or a screenshot of an entire webpage containing
one or more products.

Identify every distinct sellable product visible. For each one, extract or infer:
- title: concise, customer-facing product name
- description: 2-4 sentences, marketing-appropriate, factual only (no invented claims)
- category: a single general category (e.g. "Electronics > Mobile Phones")
- estimatedPriceBDT: your best-effort market price estimate in Bangladeshi Taka, or null if you
  genuinely cannot estimate
- specifications: key facts visible or confidently inferable (brand, model, material, dimensions,
  color, capacity, etc.) as flat string key-value pairs
- attributes: variant-style options if visible (e.g. {"color": ["Black","Blue"]})
- tags: 5-10 relevant search keywords
- confidence: your own confidence (0-1) that this extraction is accurate

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no commentary:
{"products":[{"title":"","description":"","category":"","estimatedPriceBDT":0,"specifications":{},"attributes":{},"tags":[],"confidence":0.8}]}

If nothing resembling a sellable product is visible, return {"products":[]} — but note the schema
requires at least one entry, so in that case return your best guess at what is shown with a low
confidence score instead of an empty array.`;

interface ExtractOptions {
  imageUrl: string; // must be a publicly reachable URL (e.g. Supabase Storage public URL)
}

/**
 * Calls Groq's free-tier multimodal Llama model to turn a product image or
 * screenshot into structured catalog data. Groq is used because it currently
 * offers a genuinely free tier with vision-capable models and an
 * OpenAI-compatible API (https://console.groq.com).
 */
export async function extractProductsFromImage({ imageUrl }: ExtractOptions): Promise<AIExtraction> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Get a free key at https://console.groq.com and set it in your environment."
    );
  }

  const model = process.env.GROQ_VISION_MODEL || "llama-4-scout-17b-16e-instruct";

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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
    throw new Error(`Groq VLM request failed (${response.status}): ${body.slice(0, 500)}`);
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

/**
 * Optional enrichment pass: cross-checks a product title against live web
 * results for a sharper price estimate, using Google Programmable Search
 * (100 free queries/day). Silently no-ops if not configured — the AI import
 * flow works fine on VLM extraction alone, this just improves accuracy.
 */
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
