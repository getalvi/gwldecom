import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

const MAX_AI_TEXT_CHARS = 8000; // keeps the LLM prompt small, fast, and cheap

/** Loads HTML once; every extractor shares this `$` instead of re-parsing. */
export function loadHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}

/**
 * Strips script/style/tracking noise and returns plain visible text for the
 * AI-extraction fallback tier. We deliberately do NOT feed raw HTML to the
 * model — cleaned text is cheaper, faster, and keeps prompt-injection
 * surface from third-party page content much smaller.
 */
export function cleanedVisibleText($: CheerioAPI): string {
  const $body = $("body").clone();
  $body.find("script, style, noscript, iframe, svg, template, link, meta").remove();
  // Strip inline event handlers / tracking attrs on whatever's left.
  $body.find("*").each((_, el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs;
    if (!attribs) return;
    for (const name of Object.keys(attribs)) {
      if (name.startsWith("on") || name === "style") delete attribs[name];
    }
  });

  const text = $body.text().replace(/\s+/g, " ").trim();
  return text.slice(0, MAX_AI_TEXT_CHARS);
}

/** Resolves a possibly-relative image URL against the page URL and dedupes. */
export function resolveImageUrls(images: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const img of images) {
    try {
      const abs = new URL(img, baseUrl).toString();
      if (!seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    } catch {
      // ignore unparsable image URLs rather than failing the whole import
    }
  }
  return out;
}
