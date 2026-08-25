// GET /api/products/[slug]/price-history — public. Returns price snapshots
// for a product, oldest first. Also records the current price as a snapshot
// if none exists for today (so the chart always has at least one point).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true, price: true, compareAtPrice: true },
  })
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Ensure a snapshot exists for today
  const todayKey = new Date().toISOString().slice(0, 10)
  const latest = await db.priceHistory.findFirst({
    where: { productId: product.id },
    orderBy: { recordedAt: 'desc' },
  })
  const latestKey = latest ? new Date(latest.recordedAt).toISOString().slice(0, 10) : null
  if (latestKey !== todayKey || !latest || latest.price !== product.price) {
    await db.priceHistory.create({
      data: {
        productId: product.id,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
      },
    }).catch(() => {})
  }

  const history = await db.priceHistory.findMany({
    where: { productId: product.id },
    orderBy: { recordedAt: 'asc' },
    take: 90, // last 90 snapshots
    select: { price: true, compareAtPrice: true, recordedAt: true },
  })

  return NextResponse.json({
    items: history.map((h) => ({
      date: new Date(h.recordedAt).toISOString().slice(0, 10),
      price: h.price,
      compareAtPrice: h.compareAtPrice,
    })),
    current: { price: product.price, compareAtPrice: product.compareAtPrice },
  })
}
