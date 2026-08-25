// GET /api/pages/[slug] — render a CMS page by slug. PUT/DELETE (staff).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const includeAll = searchParams.get('status') === 'all'
  const page = await db.page.findUnique({ where: { slug } })
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!includeAll && page.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json(page)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const existing = await db.page.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json()
  const updated = await db.page.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
      slug: body.slug ?? existing.slug,
      blocks: body.blocks ?? existing.blocks,
      status: body.status ?? existing.status,
      seoTitle: body.seoTitle ?? existing.seoTitle,
      seoDescription: body.seoDescription ?? existing.seoDescription,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'page.update',
    entityType: 'page',
    entityId: updated.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await db.page.delete({ where: { slug } })
  await appendAudit({
    actorId: user.id,
    action: 'page.delete',
    entityType: 'page',
    entityId: slug,
    ipAddress: clientIp(req),
  })
  return NextResponse.json({ ok: true })
}
