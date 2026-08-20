import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const addWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const wishlistItems = await db.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            status: true,
            images: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ wishlistItems })
  } catch (error) {
    console.error('Wishlist GET error:', error)
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
    const parsed = addWishlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { productId } = parsed.data

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const existing = await db.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Product already in wishlist', code: 'ALREADY_EXISTS' },
        { status: 409 }
      )
    }

    const wishlistItem = await db.wishlist.create({
      data: { userId, productId },
      include: { product: true },
    })

    return NextResponse.json({ wishlistItem }, { status: 201 })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    if (!productId) {
      // Try body for DELETE with body
      let bodyProductId: string | undefined
      try {
        const body = await request.json()
        bodyProductId = body.productId
      } catch {
        // no body
      }
      if (!bodyProductId) {
        return NextResponse.json(
          { error: 'Product ID required', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      await db.wishlist.deleteMany({
        where: { userId, productId: bodyProductId },
      })
    } else {
      await db.wishlist.deleteMany({
        where: { userId, productId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
