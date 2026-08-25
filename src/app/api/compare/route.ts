// GET /api/compare?slugs=slug1,slug2,slug3 — fetch multiple products for
// side-by-side comparison. Public read, published products only.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slugsParam = searchParams.get('slugs') || ''
  const slugs = slugsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)

  if (!slugs.length) {
    return NextResponse.json({ items: [] })
  }

  const products = await db.product.findMany({
    where: { slug: { in: slugs }, status: 'published' },
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      reviews: { select: { rating: true } },
    },
  })

  // Preserve the order requested by the user.
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean) as typeof products

  // Attach reviewStats (same shape as /api/products).
  const items = ordered.map((p) => {
    const ratings = (p.reviews || []).map((r) => r.rating)
    const count = ratings.length
    const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0
    const { reviews, ...rest } = p
    return { ...rest, reviewStats: { avg, count } }
  })

  return NextResponse.json({ items })
}
