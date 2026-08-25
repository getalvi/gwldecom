// GET /api/pages — list pages (published only, unless ?all=1 staff). POST (staff).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const where = all ? {} : { status: 'published' }
  const pages = await db.page.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: all
      ? undefined
      : { id: true, title: true, slug: true, seoTitle: true, status: true, createdAt: true },
  })
  return NextResponse.json(pages)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const page = await db.page.create({
    data: {
      title: body.title,
      slug: body.slug || apiSlug(body.title),
      blocks: body.blocks || [],
      status: body.status || 'draft',
      seoTitle: body.seoTitle || null,
      seoDescription: body.seoDescription || null,
      createdBy: user.id,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'page.create',
    entityType: 'page',
    entityId: page.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(page, { status: 201 })
}
