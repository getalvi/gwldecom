import type { MetadataRoute } from "next"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")

/**
 * Served at /robots.txt (Next.js App Router convention). Disallows
 * account-specific, auth, checkout, and admin routes — none of these
 * should be crawled or indexed, and letting bots hit them wastes crawl
 * budget and can surface duplicate/thin/user-specific pages in search
 * results. /search is disallowed too, since query-driven result pages are
 * effectively infinite duplicate-content variants of the catalog.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/checkout",
          "/login",
          "/register",
          "/search",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
