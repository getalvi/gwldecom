import type { CheerioAPI } from "cheerio";
import type { Availability, Extractor, RawExtraction } from "../types";

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseAvailability(raw: unknown): Availability | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.toLowerCase();
  if (v.includes("instock")) return "in_stock";
  if (v.includes("outofstock")) return "out_of_stock";
  if (v.includes("preorder")) return "preorder";
  return "unknown";
}

function pickBrand(brand: unknown): string | undefined {
  if (typeof brand === "string") return brand;
  if (brand && typeof brand === "object" && "name" in (brand as Record<string, unknown>)) {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === "string") return name;
  }
  return undefined;
}

/** Finds the first node in an LD+JSON graph whose @type includes "Product". */
function findProductNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[]) {
      const found = findProductNode(child);
      if (found) return found;
    }
  }

  const type = obj["@type"];
  const types = asArray(type as string | string[] | undefined);
  if (types.some((t) => typeof t === "string" && t.toLowerCase() === "product")) {
    return obj;
  }

  return null;
}

/** Requires a cheerio `$` (already-loaded DOM) so we parse the HTML once, not per-extractor. */
export function extractJsonLd($: CheerioAPI, _url: string): RawExtraction | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const el of scripts) {
    const raw = $(el).contents().text();
    if (!raw?.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // malformed JSON-LD is common in the wild — skip, don't crash
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const product = findProductNode(candidate);
      if (!product) continue;

      const offersRaw = asArray(product.offers as Record<string, unknown> | Record<string, unknown>[] | undefined);
      const offer = offersRaw[0] as Record<string, unknown> | undefined;

      const images = asArray(product.image as string | string[] | undefined).filter(
        (i): i is string => typeof i === "string"
      );

      const aggregateRating = product.aggregateRating as Record<string, unknown> | undefined;

      const specifications: Record<string, string> = {};
      const additionalProps = asArray(
        product.additionalProperty as Record<string, unknown> | Record<string, unknown>[] | undefined
      );
      for (const prop of additionalProps) {
        const name = prop?.name;
        const value = prop?.value;
        if (typeof name === "string" && (typeof value === "string" || typeof value === "number")) {
          specifications[name] = String(value);
        }
      }

      const result: RawExtraction = {
        title: typeof product.name === "string" ? product.name : undefined,
        description: typeof product.description === "string" ? product.description : undefined,
        brand: pickBrand(product.brand),
        sku:
          typeof product.sku === "string"
            ? product.sku
            : typeof product.gtin13 === "string"
              ? product.gtin13
              : typeof product.mpn === "string"
                ? product.mpn
                : undefined,
        category: typeof product.category === "string" ? product.category : undefined,
        price: offer && typeof offer.price !== "undefined" ? Number(offer.price) || undefined : undefined,
        currency: offer && typeof offer.priceCurrency === "string" ? offer.priceCurrency : undefined,
        availability: offer ? parseAvailability(offer.availability) : undefined,
        images: images.length ? images : undefined,
        specifications: Object.keys(specifications).length ? specifications : undefined,
        ratingValue:
          aggregateRating && typeof aggregateRating.ratingValue !== "undefined"
            ? Number(aggregateRating.ratingValue) || undefined
            : undefined,
        ratingCount:
          aggregateRating &&
          (typeof aggregateRating.reviewCount !== "undefined" || typeof aggregateRating.ratingCount !== "undefined")
            ? Number(aggregateRating.reviewCount ?? aggregateRating.ratingCount) || undefined
            : undefined,
      };

      return result;
    }
  }

  return null;
}

export const jsonLdExtractor: Pick<Extractor, "tier"> = { tier: "json-ld" };
