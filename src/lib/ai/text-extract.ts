import { urlImportExtractionSchema, type UrlImportExtraction } from "@/lib/ai/schema";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * NOTE: mirrors the conventions in lib/ai/vlm.ts (same env var prefix check,
 * same "throw on missing key -> route maps to 503" contract used by
 * /api/ai/extract-product). If vlm.ts reads GROQ_API_KEY under a different
 * name, align this with that rather than the reverse.
 */
function requireGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured — set it in your environment to use AI extraction");
  }
  return key;
}

const SYSTEM_PROMPT = `You extract structured e-commerce product data from cleaned webpage text.
Return ONLY a JSON object matching this exact shape, no prose, no markdown fences:
{
  "title": string,
  "description": string,
  "brand": string | null,
  "sku": string | null,
  "category": string,
  "price": number | null,
  "currency": string | null (ISO 4217, e.g. "USD", "BDT"),
  "availability": "in_stock" | "out_of_stock" | "preorder" | "unknown",
  "images": string[] (absolute URLs only, omit if unsure),
  "specifications": { [key: string]: string },
  "attributes": { [key: string]: string[] },
  "tags": string[],
  "confidence": number (0-1, your own confidence in this extraction)
}
If a field cannot be determined, use null/empty-default rather than guessing wildly.
Never invent a price you did not see in the text.`;

/**
 * Tier-5 fallback: called only when JSON-LD / OpenGraph / Microdata left
 * critical fields (title, price) empty. Feeds cleaned visible text — never
 * raw HTML — to keep tokens down and reduce prompt-injection surface from
 * third-party page content.
 */
export async function extractProductFromText(params: {
  cleanedText: string;
  url: string;
  partial?: Record<string, unknown>;
}): Promise<UrlImportExtraction> {
  const apiKey = requireGroqKey();
  const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

  const userContent = [
    `Page URL: ${params.url}`,
    params.partial && Object.keys(params.partial).length
      ? `Already-known fields (fill in the rest, don't contradict these): ${JSON.stringify(params.partial)}`
      : null,
    `Page text:\n${params.cleanedText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI extraction request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI extraction returned no content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI extraction returned invalid JSON");
  }

  const result = urlImportExtractionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`AI extraction did not match expected schema: ${result.error.message}`);
  }

  return result.data;
}
