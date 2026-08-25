// POST /api/orders — place an order. Validates stock + coupon, atomically
// decrements stock per item (equivalent to the Supabase decrement_stock RPC),
// creates order_items, increments coupon usage. All in a Prisma transaction.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'
import type { CartItem } from '@/lib/types'

export async function GET() {
  // staff list all; customers list their own
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const where = user.role === 'admin' || user.role === 'staff' ? {} : { customerId: user.id }
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: { select: { id: true, title: true, slug: true } } } },
    },
  })
  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 })
  }
  const body = await req.json()
  const items: CartItem[] = body.items || []
  const address = body.shippingAddress
  const paymentMethod = body.paymentMethod || 'cod'
  const couponCode = body.couponCode || null

  if (!items.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }
  if (!address || !address.fullName || !address.phone || !address.addressLine1) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
  }

  // Fetch the live products to validate price + stock (never trust client price)
  const productIds = items.map((i) => i.productId)
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, stockQuantity: true, status: true, title: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  // verify all published + enough stock
  for (const item of items) {
    const p = byId.get(item.productId)
    if (!p || p.status !== 'published') {
      return NextResponse.json({ error: `Product unavailable: ${item.title}` }, { status: 400 })
    }
    if (p.stockQuantity < item.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${p.title} (only ${p.stockQuantity} left)` },
        { status: 400 }
      )
    }
  }

  const subtotal = items.reduce((s, i) => s + byId.get(i.productId)!.price * i.quantity, 0)

  // coupon validation
  let discount = 0
  let couponRecord: { id: string; code: string } | null = null
  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: 'Invalid coupon' }, { status: 400 })
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Coupon expired' }, { status: 400 })
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { error: `Minimum order ৳${coupon.minOrderAmount} required for this coupon` },
        { status: 400 }
      )
    }
    if (coupon.type === 'percentage') {
      discount = Math.round((subtotal * coupon.value) / 100)
    } else {
      discount = Math.min(coupon.value, subtotal)
    }
    couponRecord = { id: coupon.id, code: coupon.code }
  }

  const total = Math.max(0, subtotal - discount)

  // Run the order + stock decrement + coupon increment in a transaction.
  try {
    const order = await db.$transaction(async (tx) => {
      // decrement stock atomically per item
      for (const item of items) {
        const ok = await decrementStockTx(tx, item.productId, item.quantity)
        if (!ok) {
          throw new Error(`Insufficient stock for ${byId.get(item.productId)!.title}`)
        }
      }
      const created = await tx.order.create({
        data: {
          customerId: user.id,
          status: 'pending',
          paymentMethod,
          paymentStatus: 'unpaid',
          total,
          shippingAddress: address as never,
          couponCode: couponRecord?.code || null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: byId.get(item.productId)!.price,
            })),
          },
        },
        include: { items: true },
      })
      if (couponRecord) {
        await tx.coupon.update({
          where: { id: couponRecord.id },
          data: { usedCount: { increment: 1 } },
        })
      }
      return created
    })

    await appendAudit({
      actorId: user.id,
      action: 'order.create',
      entityType: 'order',
      entityId: order.id,
      metadata: { total, itemCount: items.length },
      ipAddress: clientIp(req),
    })

    return NextResponse.json(order, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Order failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// Inline transactional stock decrement (mirrors the decrement_stock RPC).
async function decrementStockTx(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  productId: string,
  qty: number
): Promise<boolean> {
  const updated = await tx.product.updateMany({
    where: { id: productId, stockQuantity: { gte: qty } },
    data: { stockQuantity: { decrement: qty } },
  })
  return updated.count > 0
}
