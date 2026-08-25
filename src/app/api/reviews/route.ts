// GET /api/reviews?productId=X — list reviews for a product. POST add (auth).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (productId) {
    const reviews = await db.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    })
    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0
    return NextResponse.json({ items: reviews, avg, count: reviews.length })
  }
  // staff: list all for moderation
  const reviews = await db.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true } },
      product: { select: { id: true, title: true, slug: true } },
    },
  })
  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'Please sign in to review' }, { status: 401 })
  }
  const { productId, rating, title, body } = await req.json()
  if (!productId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'productId and rating (1-5) required' }, { status: 400 })
  }
  try {
    const review = await db.review.create({
      data: {
        productId,
        userId: user.id,
        rating: Number(rating),
        title: title || null,
        body: body || null,
      },
      include: { user: { select: { id: true, fullName: true } } },
    })
    return NextResponse.json(review, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'You already reviewed this product' }, { status: 409 })
  }
}
