import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be 1-5'),
  title: z.string().optional(),
  body: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const reviews = await db.review.findMany({
      where: { productId, hidden: false },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { productId, rating, title, body: reviewBody } = parsed.data

    // Check one review per product per user
    const existing = await db.review.findUnique({
      where: { userId_productId: { userId, productId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this product', code: 'ALREADY_REVIEWED' },
        { status: 409 }
      )
    }

    // Check if user purchased this product (delivered order)
    const purchased = await db.orderItem.findFirst({
      where: {
        productId,
        order: {
          customerId: userId,
          status: 'delivered',
        },
      },
    })

    const review = await db.review.create({
      data: {
        productId,
        userId,
        rating,
        title,
        body: reviewBody,
        verified: !!purchased,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
