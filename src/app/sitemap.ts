// Dynamic sitemap. Lists the homepage and all published CMS pages. (Storefront
// product/category routes are hash-routed in this SPA, so only stable server
// URLs are included here.)
import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-static'
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bdshop.example'

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  try {
    const pages = await db.page.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
    })
    for (const p of pages) {
      entries.push({
        url: `${baseUrl}/#${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch {
    // db unavailable at build time — skip
  }

  return entries
}
