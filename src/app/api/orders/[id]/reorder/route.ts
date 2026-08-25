// GET /api/orders/[id]/reorder — returns the order's items in a cart-ready
// shape, skipping items no longer in stock or unpublished. Auth required;
// customers can only reorder their own orders, staff/admin any.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              stockQuantity: true,
              status: true,
              images: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
  })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (user.role !== 'admin' && user.role !== 'staff' && order.customerId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Build cart-ready items, skipping unavailable products.
  const items = []
  let skipped = 0
  for (const it of order.items) {
    const p = it.product
    if (!p || p.status !== 'published' || p.stockQuantity <= 0) {
      skipped++
      continue
    }
    // cap quantity at current stock
    const qty = Math.min(it.quantity, p.stockQuantity)
    items.push({
      productId: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      quantity: qty,
      image: p.images?.[0]?.url || null,
      stock: p.stockQuantity,
    })
  }

  return NextResponse.json({
    items,
    skipped,
    count: items.length,
    originalOrderId: order.id,
  })
}
