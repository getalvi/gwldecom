// POST /api/abandoned-carts — client beacon to snapshot the current cart
// (called when items are added, throttled client-side). Auth optional: if
// logged in, links to the user; otherwise uses a session ID cookie.
// GET /api/abandoned-carts — staff-only: lists recent abandoned carts.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireStaff } from '@/lib/auth'

const SESSION_COOKIE = 'bdshop_sid'

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
  const carts = await db.abandonedCart.findMany({
    where: { itemCount: { gt: 0 } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, email: true, fullName: true } },
    },
  })
  return NextResponse.json({ items: carts, count: carts.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  const total = items.reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0)
  const itemCount = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0)

  const session = await getSession()
  // session ID for anonymous users
  let sessionId = body.sessionId as string | undefined

  // upsert: if user is logged in, find their existing cart; else by sessionId
  let existing
  if (session) {
    existing = await db.abandonedCart.findFirst({
      where: { userId: session.id },
      orderBy: { updatedAt: 'desc' },
    })
  } else if (sessionId) {
    existing = await db.abandonedCart.findFirst({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  if (existing) {
    const updated = await db.abandonedCart.update({
      where: { id: existing.id },
      data: {
        items: items as never,
        total,
        itemCount,
        userId: session?.id || existing.userId,
      },
    })
    return NextResponse.json({ ok: true, id: updated.id })
  }

  const created = await db.abandonedCart.create({
    data: {
      userId: session?.id || null,
      sessionId: sessionId || null,
      items: items as never,
      total,
      itemCount,
    },
  })
  return NextResponse.json({ ok: true, id: created.id })
}
