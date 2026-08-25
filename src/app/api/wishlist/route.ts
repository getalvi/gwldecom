// GET /api/wishlist — current user's wishlist. POST add. (auth required)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET() {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const items = await db.wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
      },
    },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })
  try {
    const item = await db.wishlist.create({ data: { userId: user.id, productId } })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ ok: true, exists: true })
  }
}
