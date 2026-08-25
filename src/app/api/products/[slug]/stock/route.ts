// PATCH /api/products/[slug]/stock — staff-only inline stock update.
// Body: { stockQuantity: number }. Returns the updated product.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const existing = await db.product.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json()
  const newStock = Math.max(0, Math.floor(Number(body.stockQuantity)))
  if (Number.isNaN(newStock)) {
    return NextResponse.json({ error: 'stockQuantity must be a number' }, { status: 400 })
  }
  const updated = await db.product.update({
    where: { slug },
    data: { stockQuantity: newStock },
    select: { id: true, slug: true, title: true, stockQuantity: true, sku: true },
  })
  await appendAudit({
    actorId: user.id,
    action: 'product.stock_update',
    entityType: 'product',
    entityId: updated.id,
    metadata: { from: existing.stockQuantity, to: newStock, title: updated.title },
    ipAddress: clientIp(req),
  })
  return NextResponse.json(updated)
}
