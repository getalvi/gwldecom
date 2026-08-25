// PATCH /api/questions/[id]/answer — staff-only. Answer a pending question.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const existing = await db.productQuestion.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { answer } = await req.json()
  if (!answer || answer.trim().length < 2) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }
  const updated = await db.productQuestion.update({
    where: { id },
    data: {
      answer: answer.trim(),
      answeredBy: user.id,
      answeredAt: new Date(),
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'question.answer',
    entityType: 'product_question',
    entityId: id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(updated)
}
