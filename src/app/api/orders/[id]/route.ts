// GET/PUT /api/orders/[id] — detail + status update (staff only for status).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

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
      items: { include: { product: { select: { id: true, title: true, slug: true } } } },
      customer: { select: { id: true, email: true, fullName: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (user.role !== 'admin' && user.role !== 'staff' && order.customerId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const existing = await db.order.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const updated = await db.order.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      paymentStatus: body.paymentStatus ?? existing.paymentStatus,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'order.update',
    entityType: 'order',
    entityId: id,
    metadata: { status: updated.status, paymentStatus: updated.paymentStatus },
    ipAddress: clientIp(req),
  })
  return NextResponse.json(updated)
}
