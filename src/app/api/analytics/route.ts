import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const trackEventSchema = z.object({
  type: z.string().min(1, 'Event type is required'),
  productId: z.string().optional(),
  metadata: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = trackEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined
    const sessionId = request.headers.get('X-Session-Id')

    await db.analyticsEvent.create({
      data: {
        type: parsed.data.type,
        userId: userId || null,
        productId: parsed.data.productId || null,
        sessionId: sessionId || null,
        metadata: parsed.data.metadata || '{}',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const [
      totalOrders,
      ordersByStatus,
      totalProducts,
      totalCustomers,
      recentOrders,
      topProducts,
      revenueByDayRaw,
    ] = await Promise.all([
      db.order.count(),
      db.order.groupBy({
        by: ['status'],
        _count: true,
        _sum: { total: true },
      }),
      db.product.count({ where: { status: 'published' } }),
      db.user.count({ where: { role: 'customer' } }),
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
        },
      }),
      db.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      db.$queryRaw<Array<{ date: string; total: number }>>`
        SELECT DATE(createdAt) as date, SUM(total) as total
        FROM "Order"
        WHERE createdAt >= datetime('now', '-7 days')
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,
    ])

    const totalRevenue = await db.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: 'paid' },
    })

    // Enrich top products with names
    const topProductIds = topProducts.map((p) => p.productId)
    const productsData = topProductIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, title: true, images: { orderBy: { position: 'asc' }, take: 1 } },
        })
      : []
    const productMap = Object.fromEntries(productsData.map((p) => [p.id, p]))

    const enrichedTopProducts = topProducts.map((p) => ({
      ...p,
      product: productMap[p.productId] || null,
    }))

    return NextResponse.json({
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      totalCustomers,
      totalProducts,
      recentOrders,
      topProducts: enrichedTopProducts,
      ordersByStatus,
      revenueByDay: revenueByDayRaw,
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
