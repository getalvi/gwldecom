// GET /api/brands, POST /api/brands (staff)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET() {
  const brands = await db.brand.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(brands)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const brand = await db.brand.create({
    data: {
      name: body.name,
      slug: body.slug || apiSlug(body.name),
      logoUrl: body.logoUrl || null,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'brand.create',
    entityType: 'brand',
    entityId: brand.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(brand, { status: 201 })
}
