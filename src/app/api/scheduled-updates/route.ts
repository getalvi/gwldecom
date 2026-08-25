// GET /api/scheduled-updates — staff-only. Lists pending + applied updates.
// POST — create a scheduled update.
// POST /api/scheduled-updates/apply — apply all due updates (cron-style).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const updates = await db.scheduledUpdate.findMany({
    where: {},
    orderBy: [{ applied: 'asc' }, { applyAt: 'asc' }],
    take: 50,
    include: {
      product: { select: { id: true, title: true, slug: true, price: true, stockQuantity: true } },
    },
  })
  return NextResponse.json({ items: updates })
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { productId, field, value, applyAt } = body
  if (!productId || !field || value === undefined || !applyAt) {
    return NextResponse.json({ error: 'productId, field, value, applyAt required' }, { status: 400 })
  }
  if (!['price', 'stockQuantity', 'compareAtPrice'].includes(field)) {
    return NextResponse.json({ error: 'field must be price|stockQuantity|compareAtPrice' }, { status: 400 })
  }
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

  const update = await db.scheduledUpdate.create({
    data: {
      productId,
      field,
      value: Number(value),
      applyAt: new Date(applyAt),
      createdBy: user.id,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'scheduled_update.create',
    entityType: 'product',
    entityId: productId,
    metadata: { field, value, applyAt },
    ipAddress: clientIp(req),
  })
  return NextResponse.json(update, { status: 201 })
}
