import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createOrderSchema = z.object({
  sessionId: z.string().optional(),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  shippingMethodId: z.string().min(1, 'Shipping method is required'),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    if (userRole === 'admin') {
      const status = searchParams.get('status')
      const where: Record<string, unknown> = {}
      if (status) where.status = status

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            items: true,
            statusHistory: { orderBy: { createdAt: 'asc' } },
            coupon: { select: { id: true, code: true, type: true, value: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.order.count({ where }),
      ])

      return NextResponse.json({
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      })
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: { customerId: userId },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
          coupon: { select: { id: true, code: true, type: true, value: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where: { customerId: userId } }),
    ])

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Orders GET error:', error)
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
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { sessionId, shippingAddress, shippingMethodId, couponCode, notes, paymentMethod } = parsed.data

    // Get cart items
    const cartWhere: Record<string, unknown> = userId ? { userId } : { sessionId }
    const cartItems = await db.cartItem.findMany({
      where: cartWhere,
      include: { product: true, variant: true },
    })

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty', code: 'EMPTY_CART' },
        { status: 400 }
      )
    }

    // Get shipping method
    const shippingMethod = await db.shippingMethod.findUnique({
      where: { id: shippingMethodId },
    })
    if (!shippingMethod || !shippingMethod.active) {
      return NextResponse.json(
        { error: 'Invalid shipping method', code: 'INVALID_SHIPPING' },
        { status: 400 }
      )
    }

    // Validate stock for all items (server-side price recalculation)
    const orderItemsData: Array<{
      productId: string
      variantId: string | null
      productName: string
      productImage: string | null
      variantName: string | null
      quantity: number
      unitPrice: number
      total: number
      product: { id: string; title: string; price: number; stockQuantity: number }
      variant: { id: string; name: string; price: number | null; stockQuantity: number } | null
    }> = []

    for (const item of cartItems) {
      const product = item.product
      if (product.status !== 'published') {
        return NextResponse.json(
          { error: `Product "${product.title}" is no longer available`, code: 'PRODUCT_UNAVAILABLE' },
          { status: 400 }
        )
      }

      const unitPrice = item.variantId && item.variant?.price != null
        ? item.variant.price
        : product.price

      // Stock check
      if (item.variantId) {
        if (!item.variant || item.variant.stockQuantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.title} - ${item.variant?.name || 'variant'}`, code: 'INSUFFICIENT_STOCK' },
            { status: 400 }
          )
        }
      } else {
        if (product.stockQuantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.title}`, code: 'INSUFFICIENT_STOCK' },
            { status: 400 }
          )
        }
      }

      const mainImage = product.images?.[0]?.url || null
      orderItemsData.push({
        productId: product.id,
        variantId: item.variantId,
        productName: product.title,
        productImage: mainImage as string | null,
        variantName: item.variant?.name || null,
        quantity: item.quantity,
        unitPrice,
        total: Math.round(unitPrice * item.quantity * 100) / 100,
        product,
        variant: item.variant,
      })
    }

    // Calculate subtotal
    const subtotal = Math.round(orderItemsData.reduce((sum, i) => sum + i.total, 0) * 100) / 100

    // Apply coupon
    let discount = 0
    let coupon: { id: string; code: string; type: string; value: number; maxDiscount?: number | null; minOrderAmount?: number | null; maxUses?: number | null; usedCount: number; active: boolean; startsAt?: Date | null; expiresAt?: Date | null; perUserLimit?: number | null } | null = null

    if (couponCode) {
      coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (!coupon || !coupon.active) {
        return NextResponse.json(
          { error: 'Invalid or inactive coupon code', code: 'INVALID_COUPON' },
          { status: 400 }
        )
      }
      const now = new Date()
      if (coupon.expiresAt && coupon.expiresAt < now) {
        return NextResponse.json(
          { error: 'Coupon has expired', code: 'COUPON_EXPIRED' },
          { status: 400 }
        )
      }
      if (coupon.startsAt && coupon.startsAt > now) {
        return NextResponse.json(
          { error: 'Coupon is not yet active', code: 'COUPON_NOT_ACTIVE' },
          { status: 400 }
        )
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { error: 'Coupon usage limit reached', code: 'COUPON_LIMIT_REACHED' },
          { status: 400 }
        )
      }
      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return NextResponse.json(
          { error: `Minimum order amount of ${coupon.minOrderAmount} required for this coupon`, code: 'COUPON_MIN_ORDER' },
          { status: 400 }
        )
      }
      if (coupon.perUserLimit) {
        const userUsageCount = await db.couponUsage.count({
          where: { couponId: coupon.id, userId },
        })
        if (userUsageCount >= coupon.perUserLimit) {
          return NextResponse.json(
            { error: 'You have already used this coupon the maximum number of times', code: 'COUPON_USER_LIMIT' },
            { status: 400 }
          )
        }
      }

      if (coupon.type === 'percentage') {
        discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount
        }
      } else if (coupon.type === 'fixed') {
        discount = coupon.value
        if (discount > subtotal) discount = subtotal
      }
      // free_shipping type handled below
    }

    // Calculate shipping fee
    let shippingFee = shippingMethod.fee
    if (coupon?.type === 'free_shipping') {
      shippingFee = 0
    }
    if (shippingMethod.freeAbove && subtotal >= shippingMethod.freeAbove) {
      shippingFee = 0
    }

    const total = Math.round((subtotal - discount + shippingFee) * 100) / 100

    // Generate order number
    const count = await db.order.count()
 const orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`

    // Create order in a transaction-like sequence
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: userId,
        status: 'pending',
        paymentMethod: paymentMethod || 'cod',
        subtotal,
        discount,
        couponId: coupon?.id,
        shippingFee,
        total,
        shippingAddress,
        notes,
        items: {
          create: orderItemsData.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName,
            productImage: i.productImage,
            variantName: i.variantName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        },
        statusHistory: {
          create: {
            status: 'pending',
            note: 'Order placed',
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
        coupon: { select: { id: true, code: true, type: true, value: true } },
      },
    })

    // Decrement stock atomically
    for (const item of orderItemsData) {
      if (item.variantId) {
        await db.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      }
      await db.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      })
    }

    // Create coupon usage
    if (coupon) {
      await db.couponUsage.create({
        data: { couponId: coupon.id, userId, orderId: order.id },
      })
      await db.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Clear cart
    await db.cartItem.deleteMany({ where: cartWhere })

    // Create notification
    await db.notification.create({
      data: {
        userId,
        type: 'order_created',
        title: 'Order Placed Successfully',
        message: `Your order ${order.orderNumber} has been placed. Total: ${total}`,
        link: `/orders/${order.id}`,
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
