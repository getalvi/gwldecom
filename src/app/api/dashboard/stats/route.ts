// GET /api/dashboard/stats — aggregated metrics for the admin dashboard.
// Returns revenue + order counts for this period vs the previous period
// (period = 7/14/30 days, default 14). Staff only.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(Number(searchParams.get('days') || '14'), 1), 90)

  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - days)
  const prevStart = new Date(periodStart)
  prevStart.setDate(prevStart.getDate() - days)

  const [periodOrders, prevOrders, allOrders, products, users] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { total: true, status: true, createdAt: true, items: { select: { quantity: true, unitPrice: true, productId: true, product: { select: { title: true, slug: true } } } } },
    }),
    db.order.findMany({
      where: { createdAt: { gte: prevStart, lt: periodStart } },
      select: { total: true },
    }),
    db.order.findMany({ select: { total: true, status: true, createdAt: true } }),
    db.product.count(),
    db.user.count(),
  ])

  const periodRevenue = periodOrders.reduce((s, o) => s + o.total, 0)
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0)
  const revenueChange = prevRevenue > 0 ? ((periodRevenue - prevRevenue) / prevRevenue) * 100 : periodRevenue > 0 ? 100 : 0
  const orderChange = prevOrders.length > 0 ? ((periodOrders.length - prevOrders.length) / prevOrders.length) * 100 : periodOrders.length > 0 ? 100 : 0
  const aov = periodOrders.length > 0 ? periodRevenue / periodOrders.length : 0

  // Top products by revenue in this period
  const productMap = new Map<string, { title: string; slug: string; qty: number; revenue: number }>()
  for (const o of periodOrders) {
    for (const it of o.items) {
      if (!it.product) continue
      const prev = productMap.get(it.productId) || { title: it.product.title, slug: it.product.slug, qty: 0, revenue: 0 }
      prev.qty += it.quantity
      prev.revenue += it.unitPrice * it.quantity
      productMap.set(it.productId, prev)
    }
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Status distribution (all time)
  const statusDist: Record<string, number> = {}
  for (const o of allOrders) {
    statusDist[o.status] = (statusDist[o.status] || 0) + 1
  }

  return NextResponse.json({
    period: { days, revenue: periodRevenue, orders: periodOrders.length, aov },
    previous: { revenue: prevRevenue, orders: prevOrders.length },
    changes: { revenuePct: Math.round(revenueChange * 10) / 10, orderPct: Math.round(orderChange * 10) / 10 },
    totals: { products, users, allTimeRevenue: allOrders.reduce((s, o) => s + o.total, 0), allTimeOrders: allOrders.length },
    topProducts,
    statusDist,
  })
}
