// GET /api/products/[slug]/related-purchases — returns products frequently
// bought together with the given product (based on co-occurrence in past
// orders). Public read. Falls back to same-category products if no order
// co-occurrence exists.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true, categoryId: true, slug: true },
  })
  if (!product) return NextResponse.json({ items: [] })

  // Find all orders that contain this product, then collect the other
  // products in those orders ranked by co-occurrence count.
  const ordersWithProduct = await db.order.findMany({
    where: { items: { some: { productId: product.id } } },
    select: {
      items: {
        select: { productId: true, product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } } },
      },
    },
    take: 200,
  })

  const coCounts = new Map<string, { product: any; count: number }>()
  for (const o of ordersWithProduct) {
    for (const it of o.items) {
      if (it.productId === product.id) continue
      if (!it.product || it.product.status !== 'published') continue
      const prev = coCounts.get(it.productId)
      if (prev) prev.count++
      else coCounts.set(it.productId, { product: it.product, count: 1 })
    }
  }

  let items = Array.from(coCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((x) => ({ ...x.product, coOccurrence: x.count }))

  // Fallback: if no co-purchase data, show up to 3 other published products
  // in the same category (excluding self).
  if (items.length < 3 && product.categoryId) {
    const existing = new Set([product.id, ...items.map((p) => p.id)])
    const fallback = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: 'published',
        id: { notIn: Array.from(existing) },
      },
      take: 3 - items.length,
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
    })
    items = [...items, ...fallback.map((p) => ({ ...p, coOccurrence: 0 }))]
  }

  return NextResponse.json({ items })
}
