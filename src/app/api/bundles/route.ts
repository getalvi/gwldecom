// GET /api/bundles — public. Lists active bundle deals with their items.
// ?slug=X returns a single bundle.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (slug) {
    const bundle = await db.bundleDeal.findUnique({
      where: { slug, active: true },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, title: true, slug: true, price: true, compareAtPrice: true,
                stockQuantity: true, status: true,
                images: { orderBy: { position: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    })
    if (!bundle) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(bundle)
  }

  const bundles = await db.bundleDeal.findMany({
    where: { active: true },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, title: true, slug: true, price: true, compareAtPrice: true,
              stockQuantity: true, status: true,
              images: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items: bundles })
}
