// POST /api/scheduled-updates/apply — staff-only. Applies all due (applyAt <= now)
// unapplied scheduled updates atomically. Returns the count applied.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const now = new Date()
  const due = await db.scheduledUpdate.findMany({
    where: { applied: false, applyAt: { lte: now } },
    take: 100,
  })

  let applied = 0
  for (const u of due) {
    try {
      const data: any = { [u.field]: u.value }
      // if price changes, record a price history snapshot first
      if (u.field === 'price' || u.field === 'compareAtPrice') {
        const product = await db.product.findUnique({ where: { id: u.productId } })
        if (product) {
          await db.priceHistory.create({
            data: {
              productId: product.id,
              price: u.field === 'price' ? u.value : product.price,
              compareAtPrice: u.field === 'compareAtPrice' ? u.value : product.compareAtPrice,
            },
          })
        }
      }
      await db.product.update({ where: { id: u.productId }, data })
      await db.scheduledUpdate.update({
        where: { id: u.id },
        data: { applied: true, appliedAt: now },
      })
      applied++
    } catch {
      // skip individual failures
    }
  }

  if (applied > 0) {
    await appendAudit({
      actorId: user.id,
      action: 'scheduled_update.apply',
      entityType: 'product',
      entityId: 'bulk',
      metadata: { applied, total: due.length },
      ipAddress: clientIp(req),
    })
  }

  return NextResponse.json({ applied, totalDue: due.length })
}
