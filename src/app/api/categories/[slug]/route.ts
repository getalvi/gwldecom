// GET /api/categories/[slug]
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cat = await db.category.findUnique({
    where: { slug },
    include: { children: true, parent: true },
  })
  if (!cat) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(cat)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()
  const existing = await db.category.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const updated = await db.category.update({
    where: { slug },
    data: {
      name: body.name ?? existing.name,
      slug: body.slug ?? existing.slug,
      imageUrl: body.imageUrl ?? existing.imageUrl,
      parentId: body.parentId === null ? null : body.parentId ?? existing.parentId,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await db.category.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
