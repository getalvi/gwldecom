// GET /api/admin/customer-segments — staff-only. Segments customers by
// lifetime spend: VIP (>=50k BDT), Regular (5k–50k), New (<5k or 0 orders).
// Returns segment counts + top customers per segment.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const users = await db.user.findMany({
    where: { role: 'customer' },
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
      orders: { select: { total: true, createdAt: true, status: true } },
    },
  })

  const segments = {
    vip: { label: 'VIP (৳50k+)', customers: [] as any[], count: 0, revenue: 0 },
    regular: { label: 'Regular (৳5k–50k)', customers: [] as any[], count: 0, revenue: 0 },
    new: { label: 'New / Low (<৳5k)', customers: [] as any[], count: 0, revenue: 0 },
  }

  for (const u of users) {
    const spend = u.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0)
    const orderCount = u.orders.filter((o) => o.status !== 'cancelled').length
    const entry = {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      spend,
      orderCount,
      joinedAt: u.createdAt,
    }
    if (spend >= 50000) {
      segments.vip.customers.push(entry)
      segments.vip.count++
      segments.vip.revenue += spend
    } else if (spend >= 5000) {
      segments.regular.customers.push(entry)
      segments.regular.count++
      segments.regular.revenue += spend
    } else {
      segments.new.customers.push(entry)
      segments.new.count++
      segments.new.revenue += spend
    }
  }

  // Sort each segment by spend desc, keep top 10 for display
  for (const s of Object.values(segments)) {
    s.customers.sort((a, b) => b.spend - a.spend)
    s.customers = s.customers.slice(0, 10)
  }

  return NextResponse.json({
    segments: [
      { ...segments.vip, customers: undefined },
      { ...segments.regular, customers: undefined },
      { ...segments.new, customers: undefined },
    ],
    topVip: segments.vip.customers,
    topRegular: segments.regular.customers,
    topNew: segments.new.customers.slice(0, 5),
    totalCustomers: users.length,
    totalRevenue: segments.vip.revenue + segments.regular.revenue + segments.new.revenue,
  })
}
