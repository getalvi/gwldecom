// GET /api/questions/pending — staff-only. Lists all unanswered product
// questions across the catalog, with product + asker info, for the admin
// moderation queue. Supports optional ?status=pending|answered|all.
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
  const status = searchParams.get('status') || 'pending'

  const where = status === 'answered' ? { NOT: { answer: null } }
    : status === 'all' ? {}
    : { answer: null }

  const questions = await db.productQuestion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, title: true, slug: true, images: { orderBy: { position: 'asc' }, take: 1 } } },
      user: { select: { id: true, fullName: true, email: true } },
    },
    take: 100,
  })

  return NextResponse.json({ items: questions, count: questions.length, status })
}
