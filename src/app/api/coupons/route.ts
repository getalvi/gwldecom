// GET /api/coupons, POST (staff). GET validates ?code=X&total=Y for checkout.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const total = searchParams.get('total')
  const all = searchParams.get('all') === '1'

  if (all) {
    // staff list
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(coupons)
  }

  if (code) {
    const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!coupon || !coupon.active) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon' })
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Coupon expired' })
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' })
    }
    const orderTotal = Number(total) || 0
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order ৳${coupon.minOrderAmount} required`,
      })
    }
    let discount = 0
    if (coupon.type === 'percentage') {
      discount = Math.round((orderTotal * coupon.value) / 100)
    } else {
      discount = Math.min(coupon.value, orderTotal)
    }
    return NextResponse.json({ valid: true, coupon, discount })
  }

  // default: list active public coupons (for display)
  const coupons = await db.coupon.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(coupons)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.code) return NextResponse.json({ error: 'code required' }, { status: 400 })
  const coupon = await db.coupon.create({
    data: {
      code: body.code.toUpperCase(),
      type: body.type || 'percentage',
      value: Number(body.value) || 0,
      minOrderAmount: body.minOrderAmount ? Number(body.minOrderAmount) : null,
      maxUses: body.maxUses ? Number(body.maxUses) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: body.active ?? true,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'coupon.create',
    entityType: 'coupon',
    entityId: coupon.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(coupon, { status: 201 })
}
