// DELETE /api/reviews/[id] — owner or admin.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const review = await db.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (review.userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await db.review.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
