import type { CheerioAPI } from "cheerio";
import type { RawExtraction } from "../types";

function meta($: CheerioAPI, prop: string): string | undefined {
  const val =
    $(`meta[property="${prop}"]`).attr("content") ?? $(`meta[name="${prop}"]`).attr("content") ?? undefined;
  return val?.trim() || undefined;
}

function metaAll($: CheerioAPI, prop: string): string[] {
  const vals: string[] = [];
  $(`meta[property="${prop}"]`).each((_, el) => {
    const c = $(el).attr("content");
    if (c) vals.push(c);
  });
  return vals;
}

/** OpenGraph + the `product:` meta-tag vocabulary many storefronts add. */
export function extractOpenGraph($: CheerioAPI): RawExtraction | null {
  const title = meta($, "og:title") ?? $("title").first().text().trim() || undefined;
  const description = meta($, "og:description") ?? meta($, "description");
  const images = metaAll($, "og:image");
  const price = meta($, "product:price:amount") ?? meta($, "og:price:amount");
  const currency = meta($, "product:price:currency") ?? meta($, "og:price:currency");
  const brand = meta($, "product:brand") ?? meta($, "og:site_name");
  const availabilityRaw = meta($, "product:availability");

  if (!title && images.length === 0 && !price) return null;

  return {
    title,
    description,
    brand,
    images: images.length ? images : undefined,
    price: price ? Number(price) || undefined : undefined,
    currency: currency || undefined,
    availability:
      availabilityRaw === "in stock" ? "in_stock" : availabilityRaw === "out of stock" ? "out_of_stock" : undefined,
  };
}
