import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  sessionId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined
    const sessionId =
      request.headers.get('X-Session-Id') ||
      request.nextUrl.searchParams.get('sessionId')

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Session required', code: 'NO_SESSION' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (userId) {
      where.userId = userId
    } else {
      where.sessionId = sessionId
    }

    const cartItems = await db.cartItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: { where: { position: 0 }, take: 1 },
            status: true,
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cartItems })
  } catch (error) {
    console.error('Cart GET error:', error)
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

    const body = await request.json()
    const parsed = addToCartSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { productId, variantId, quantity, sessionId: bodySessionId } = parsed.data
    const sessionId = bodySessionId || request.headers.get('X-Session-Id')

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Authentication or session ID required', code: 'NO_SESSION' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, stockQuantity: true },
    })

    if (!product || product.status !== 'published') {
      return NextResponse.json(
        { error: 'Product not available', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
      })
      if (!variant || variant.productId !== productId) {
        return NextResponse.json(
          { error: 'Variant not found', code: 'VARIANT_NOT_FOUND' },
          { status: 404 }
        )
      }
      if (variant.stockQuantity < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for this variant', code: 'INSUFFICIENT_STOCK' },
          { status: 400 }
        )
      }
    } else {
      if (product.stockQuantity < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' },
          { status: 400 }
        )
      }
    }

    const existingItem = await db.cartItem.findFirst({
      where: {
        ...(userId ? { userId } : { sessionId }),
        productId,
        variantId: variantId || null,
      },
    })

    let cartItem
    if (existingItem) {
      cartItem = await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: true, variant: true },
      })
    } else {
      cartItem = await db.cartItem.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          productId,
          variantId: variantId || null,
          quantity,
        },
        include: { product: true, variant: true },
      })
    }

    return NextResponse.json({ cartItem }, { status: 201 })
  } catch (error) {
    console.error('Cart POST error:', error)
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
    const sessionId =
      request.headers.get('X-Session-Id') ||
      request.nextUrl.searchParams.get('sessionId')

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Session required', code: 'NO_SESSION' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {}
    if (userId) {
      where.userId = userId
    } else {
      where.sessionId = sessionId
    }

    await db.cartItem.deleteMany({ where })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
