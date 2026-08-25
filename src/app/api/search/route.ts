// GET /api/search?q=... — full-text-ish search across published products.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit') || '20'), 50)
  if (!q) return NextResponse.json({ items: [], total: 0, q })
  const products = await db.product.findMany({
    where: {
      status: 'published',
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      category: { select: { name: true, slug: true } },
    },
  })
  return NextResponse.json({ items: products, total: products.length, q })
}
