import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const parsed = updateQuantitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const cartItem = await db.cartItem.findUnique({
      where: { id },
      include: { product: true, variant: true },
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check stock availability
    if (cartItem.variantId) {
      if (cartItem.variant && cartItem.variant.stockQuantity < parsed.data.quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for variant', code: 'INSUFFICIENT_STOCK' },
          { status: 400 }
        )
      }
    } else {
      if (cartItem.product.stockQuantity < parsed.data.quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' },
          { status: 400 }
        )
      }
    }

    const updated = await db.cartItem.update({
      where: { id },
      data: { quantity: parsed.data.quantity },
      include: { product: true, variant: true },
    })

    return NextResponse.json({ cartItem: updated })
  } catch (error) {
    console.error('Cart item PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cartItem = await db.cartItem.findUnique({ where: { id } })
    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await db.cartItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart item DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
