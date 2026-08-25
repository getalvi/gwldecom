// GET /api/orders/export — CSV export of all orders. Staff only.
// Returns a text/csv attachment with order + line-item rows.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: { select: { title: true } } } },
      customer: { select: { email: true, fullName: true } },
    },
  })

  const header = [
    'Order ID',
    'Date',
    'Status',
    'Payment Method',
    'Payment Status',
    'Customer Email',
    'Customer Name',
    'Item',
    'Qty',
    'Unit Price',
    'Line Total',
    'Order Total',
    'Coupon',
  ]

  const rows: string[] = []
  for (const o of orders) {
    const date = new Date(o.createdAt).toISOString()
    const addr = (o.shippingAddress as Record<string, unknown> | null) || {}
    const customerName = (addr.fullName as string) || o.customer?.fullName || ''
    if (!o.items.length) {
      // order with no items — single row
      rows.push([
        o.id.slice(-8).toUpperCase(),
        date,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        o.customer?.email || '',
        customerName,
        '', '', '', '',
        o.total.toFixed(2),
        o.couponCode || '',
      ].map(csvEscape).join(','))
      continue
    }
    for (const it of o.items) {
      rows.push([
        o.id.slice(-8).toUpperCase(),
        date,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        o.customer?.email || '',
        customerName,
        it.product?.title || '',
        String(it.quantity),
        it.unitPrice.toFixed(2),
        (it.unitPrice * it.quantity).toFixed(2),
        o.total.toFixed(2),
        o.couponCode || '',
      ].map(csvEscape).join(','))
    }
  }

  const csv = [header.map(csvEscape).join(','), ...rows].join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bdshop-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
