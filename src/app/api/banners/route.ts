// GET /api/banners (active only by default; ?all=1 for staff), POST (staff)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const where = all ? {} : { active: true }
  const banners = await db.banner.findMany({ where, orderBy: { position: 'asc' } })
  return NextResponse.json(banners)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.title || !body.imageUrl) {
    return NextResponse.json({ error: 'title and imageUrl required' }, { status: 400 })
  }
  const banner = await db.banner.create({
    data: {
      title: body.title,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl || null,
      position: Number(body.position) || 0,
      active: body.active ?? true,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'banner.create',
    entityType: 'banner',
    entityId: banner.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(banner, { status: 201 })
}
