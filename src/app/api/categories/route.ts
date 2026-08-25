// GET /api/categories  → list all (optionally nested), or by slug
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (slug) {
    const cat = await db.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    })
    if (!cat) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(cat)
  }

  const cats = await db.category.findMany({ orderBy: { name: 'asc' } })
  // build tree
  const byId = new Map(cats.map((c) => [c.id, { ...c, children: [] as any[] }]))
  const roots: any[] = []
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(c)
    } else {
      roots.push(c)
    }
  }
  return NextResponse.json({ flat: cats, tree: roots })
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
  const cat = await db.category.create({
    data: {
      name: body.name,
      slug: body.slug || apiSlug(body.name),
      imageUrl: body.imageUrl || null,
      parentId: body.parentId || null,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'category.create',
    entityType: 'category',
    entityId: cat.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json(cat, { status: 201 })
}
