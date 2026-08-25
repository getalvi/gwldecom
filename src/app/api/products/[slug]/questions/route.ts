// GET /api/products/[slug]/questions — list Q&A for a product (public).
// POST — ask a question (auth required).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug }, select: { id: true } })
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const questions = await db.productQuestion.findMany({
    where: { productId: product.id },
    orderBy: [{ answer: 'asc' }, { createdAt: 'desc' }],
    include: { user: { select: { id: true, fullName: true } } },
  })
  const answered = questions.filter((q) => q.answer)
  const pending = questions.filter((q) => !q.answer)
  return NextResponse.json({ items: questions, answered: answered.length, pending: pending.length })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'Please sign in to ask a question' }, { status: 401 })
  }
  const product = await db.product.findUnique({ where: { slug }, select: { id: true } })
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { question } = await req.json()
  if (!question || question.trim().length < 5) {
    return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 })
  }
  const q = await db.productQuestion.create({
    data: {
      productId: product.id,
      userId: user.id,
      question: question.trim(),
    },
    include: { user: { select: { id: true, fullName: true } } },
  })
  return NextResponse.json(q, { status: 201 })
}
