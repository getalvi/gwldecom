import type { MetadataRoute } from "next"
import { db } from "@/lib/db"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")

/**
 * Hard cap on product URLs per sitemap. Google ignores sitemaps beyond
 * 50,000 URLs; if the catalog grows past this, switch to `generateSitemaps`
 * (see comment at the bottom) to split into multiple sitemap files instead
 * of silently dropping products.
 */
const MAX_PRODUCTS = 45000

/**
 * Served at /sitemap.xml (Next.js App Router convention — this file's
 * default export is picked up automatically, no route wiring needed).
 * Regenerated on every request that isn't served from the CDN/ISR cache;
 * `revalidate` below caps how often it re-queries the database.
 */
export const revalidate = 3600 // re-query at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_PRODUCTS,
    }),
    db.category.findMany({ select: { slug: true, createdAt: true } }),
    db.brand.findMany({ select: { slug: true, createdAt: true } }),
  ])

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/category/all`, changeFrequency: "daily", priority: 0.9 },
    // /search, /login, /register, /checkout, /account, /admin are
    // intentionally excluded — they're either disallowed in robots.txt or
    // produce duplicate/thin/user-specific content that shouldn't be indexed.
  ]

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: c.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  // Brands don't have their own listing route today, but if/when
  // `/brand/[slug]` ships this list is ready to plug in — for now brand
  // pages aren't linked so they're left out to avoid orphaned sitemap URLs.
  void brands

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  return [...staticEntries, ...categoryEntries, ...productEntries]
}

/**
 * If the catalog ever exceeds MAX_PRODUCTS, split the sitemap instead of
 * truncating it:
 *
 *   export async function generateSitemaps() {
 *     const count = await db.product.count({ where: { status: "published" } })
 *     return Array.from({ length: Math.ceil(count / 45000) }, (_, id) => ({ id }))
 *   }
 *
 *   export default async function sitemap({ id }: { id: number }) {
 *     const products = await db.product.findMany({
 *       where: { status: "published" },
 *       select: { slug: true, updatedAt: true },
 *       skip: id * 45000,
 *       take: 45000,
 *     })
 *     return products.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: p.updatedAt }))
 *   }
 *
 * Next.js then serves /sitemap/0.xml, /sitemap/1.xml, etc. and an index
 * at /sitemap.xml automatically.
 */
