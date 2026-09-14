import { parseTags } from "@/lib/utils"

const SITE_NAME = "ShopHaat"
const DEFAULT_CURRENCY = "BDT"
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")

/** Minimal shapes needed to build Product/Review JSON-LD. Matches (a subset
 *  of) what `db.product.findUnique({ include: { reviews: { include: { user } } } })`
 *  already returns, so no extra query is needed on the product page. */
export type SchemaReview = {
  id?: string
  rating: number
  title?: string | null
  body?: string | null
  createdAt: Date | string
  user?: { fullName?: string | null } | null
}

export type SchemaProduct = {
  title: string
  slug: string
  description: string
  price: number | string
  currency?: string | null
  compareAtPrice?: number | string | null
  stockQuantity?: number | null
  sku?: string | null
  tags?: string | null
  images: { url: string }[]
  category?: { name: string } | null
  brand?: { name: string } | null
  reviews: SchemaReview[]
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

function toIsoDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

/** Clamps and rounds a rating to the 1–5 range schema.org / Google expect,
 *  never emitting 0 or a value outside the scale even if source data is odd. */
function clampRating(rating: number): number {
  const n = Number.isFinite(rating) ? rating : 0
  return Math.min(5, Math.max(1, n))
}

/**
 * Builds a complete schema.org `Product` JSON-LD object — including nested
 * `AggregateRating` and up to `maxReviews` `Review` entries — from a single
 * product record and its reviews. Reviews without a usable rating are
 * skipped for AggregateRating math but still shown once we have a rating.
 *
 * Pass the result straight to <ProductSchema product={...} /> or to
 * JSON.stringify() if you need the raw object (e.g. for a sitemap or API).
 */
export function buildProductJsonLd(product: SchemaProduct, opts: { maxReviews?: number } = {}) {
  const maxReviews = opts.maxReviews ?? 20
  const currency = (product.currency || DEFAULT_CURRENCY).toUpperCase()
  const price = Number(product.price)
  const canonicalUrl = absoluteUrl(`/product/${product.slug}`)
  const images = product.images.map((i) => absoluteUrl(i.url)).filter(Boolean)
  const inStock = (product.stockQuantity ?? 0) > 0

  const ratedReviews = product.reviews.filter((r) => Number.isFinite(r.rating) && r.rating > 0)
  const reviewCount = ratedReviews.length
  const avgRating = reviewCount
    ? ratedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description?.trim() || product.title,
    url: canonicalUrl,
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand?.name ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.category?.name ? { category: product.category.name } : {}),
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: currency,
      price: Number.isFinite(price) ? price.toFixed(2) : "0.00",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  }

  // AggregateRating and Review are only valid (and only helpful for rich
  // results) when there's at least one real, rated review — Google
  // penalizes markup with fabricated or missing rating data.
  if (reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(avgRating.toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }

    jsonLd.review = ratedReviews.slice(0, maxReviews).map((r) => ({
      "@type": "Review",
      ...(r.title?.trim() ? { name: r.title.trim() } : {}),
      reviewBody: r.body?.trim() || undefined,
      datePublished: toIsoDate(r.createdAt),
      author: { "@type": "Person", name: r.user?.fullName?.trim() || "Verified Buyer" },
      reviewRating: {
        "@type": "Rating",
        ratingValue: clampRating(r.rating),
        bestRating: 5,
        worstRating: 1,
      },
    }))
  }

  const keywords = [product.brand?.name, product.category?.name, ...parseTags(product.tags ?? "")].filter(
    (v): v is string => Boolean(v)
  )
  if (keywords.length) jsonLd.keywords = keywords.join(", ")

  return jsonLd
}
