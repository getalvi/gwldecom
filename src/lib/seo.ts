import type { Metadata } from "next"
import { parseTags } from "@/lib/utils"

const SITE_NAME = "ShopHaat"
const DEFAULT_CURRENCY = "BDT"
const META_DESCRIPTION_MAX = 160

/** Minimal shape needed to build SEO metadata for a product.
 *  Matches (a subset of) what `db.product.findUnique` already returns,
 *  so no extra query is needed on the product page. */
export type SeoProductImage = {
  url: string
  altText?: string | null
}

export type SeoProduct = {
  title: string
  slug: string
  description: string
  price: number | string
  currency?: string | null
  compareAtPrice?: number | string | null
  stockQuantity?: number | null
  sku?: string | null
  tags?: string | null
  images: SeoProductImage[]
  category?: { name: string } | null
  brand?: { name: string } | null
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…"
}

/**
 * Builds descriptive alt text for a product image from real product
 * attributes, instead of a generic placeholder.
 *
 * Priority:
 *  1. Editor-supplied alt text on the image itself (if present).
 *  2. Otherwise, an auto-generated description built from brand + title +
 *     category, with a "view N" suffix for secondary gallery images.
 */
export function buildProductImageAlt(
  product: Pick<SeoProduct, "title" | "brand" | "category">,
  image?: SeoProductImage,
  index = 0
): string {
  if (image?.altText && image.altText.trim()) return image.altText.trim()

  const parts = [product.brand?.name, product.title].filter(Boolean)
  let alt = parts.join(" ")
  if (product.category?.name) alt += ` – ${product.category.name}`
  if (index > 0) alt += ` (view ${index + 1})`
  return alt
}

/** Product page <title>. The site-wide template ("%s | ShopHaat") already
 *  appends the brand suffix, so this only needs the product-specific part. */
export function buildProductTitle(product: Pick<SeoProduct, "title" | "brand">): string {
  if (product.brand?.name && !product.title.toLowerCase().includes(product.brand.name.toLowerCase())) {
    return `${product.title} – ${product.brand.name}`
  }
  return product.title
}

/** Meta description: prefer the real product description (trimmed to a
 *  search-engine-friendly length); fall back to an auto-generated one built
 *  from brand/category/price if the description is empty. */
export function buildProductMetaDescription(product: SeoProduct): string {
  if (product.description && product.description.trim()) {
    return truncateAtWordBoundary(product.description, META_DESCRIPTION_MAX)
  }
  const bits = [
    `Buy ${product.title}`,
    product.brand?.name ? `by ${product.brand.name}` : null,
    product.category?.name ? `in ${product.category.name}` : null,
    `online at ${SITE_NAME}.`,
    "Genuine products, fast nationwide delivery, cash on delivery.",
  ].filter(Boolean)
  return truncateAtWordBoundary(bits.join(" "), META_DESCRIPTION_MAX)
}

/**
 * Builds a complete Next.js `Metadata` object (title, description,
 * OpenGraph, Twitter card, canonical URL) for a product detail page,
 * derived entirely from the product's own data.
 */
export function generateProductMetadata(product: SeoProduct): Metadata {
  const title = buildProductTitle(product)
  const description = buildProductMetaDescription(product)
  const canonicalPath = `/product/${product.slug}`
  const keywords = [
    product.brand?.name,
    product.category?.name,
    ...parseTags(product.tags ?? ""),
  ].filter((v): v is string => Boolean(v))

  const ogImages = product.images.slice(0, 4).map((image, i) => ({
    url: image.url,
    alt: buildProductImageAlt(product, image, i),
    width: 1200,
    height: 1200,
  }))

  const inStock = (product.stockQuantity ?? 0) > 0

  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      type: "website",
      images: ogImages.length ? ogImages : undefined,
    },
    twitter: {
      card: ogImages.length ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages.length ? ogImages.map((i) => i.url) : undefined,
    },
    other: {
      "product:availability": inStock ? "in stock" : "out of stock",
      "product:price:amount": String(product.price),
      "product:price:currency": product.currency || DEFAULT_CURRENCY,
    },
  }
}

/** Metadata for a slug that doesn't resolve to a published product. */
export function notFoundProductMetadata(): Metadata {
  return {
    title: "Product not found",
    robots: { index: false, follow: false },
  }
}
