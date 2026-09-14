import { buildProductJsonLd, type SchemaProduct } from "@/lib/product-schema"

/**
 * Escapes characters that could break out of the <script> tag or be used
 * for injection (e.g. a review body containing "</script>"). JSON.stringify
 * alone is NOT safe to drop into HTML — this must run on top of it.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/**
 * Renders a schema.org `Product` JSON-LD `<script>` tag — with nested
 * `AggregateRating` and `Review` entries when the product has reviews — so
 * Google can show star ratings and pricing in search results.
 *
 * Server component: drop it anywhere in a product page's JSX. It renders
 * nothing visible.
 *
 * @example
 * // src/app/product/[slug]/page.tsx
 * <ProductSchema product={{ ...product, reviews: product.reviews }} />
 */
export function ProductSchema({ product, maxReviews }: { product: SchemaProduct; maxReviews?: number }) {
  const jsonLd = buildProductJsonLd(product, { maxReviews })
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  )
}
