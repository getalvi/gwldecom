// GET /api/products/[slug] — full detail with images, reviews, related.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const includeAll = searchParams.get('status') === 'all'
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: 'asc' } },
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  })
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!includeAll && product.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  // related: same category, exclude self
  let related: any[] = []
  if (product.categoryId) {
    related = await db.product.findMany({
      where: { categoryId: product.categoryId, status: 'published', id: { not: product.id } },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
    })
  }
  return NextResponse.json({ ...product, related })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const existing = await db.product.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json()
  // handle image updates separately if provided
  const updated = await db.product.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
      slug: body.slug ?? existing.slug,
      description: body.description ?? existing.description,
      specifications: body.specifications ?? existing.specifications,
      attributes: body.attributes ?? existing.attributes,
      tags: body.tags ?? existing.tags,
      categoryId: body.categoryId ?? existing.categoryId,
      brandId: body.brandId ?? existing.brandId,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      compareAtPrice:
        body.compareAtPrice !== undefined
          ? body.compareAtPrice
            ? Number(body.compareAtPrice)
            : null
          : existing.compareAtPrice,
      stockQuantity:
        body.stockQuantity !== undefined ? Number(body.stockQuantity) : existing.stockQuantity,
      sku: body.sku ?? existing.sku,
      status: body.status ?? existing.status,
    },
  })
  // replace images if provided
  if (Array.isArray(body.images)) {
    await db.productImage.deleteMany({ where: { productId: updated.id } })
    if (body.images.length) {
      await db.productImage.createMany({
        data: body.images.map((img: any, i: number) => ({
          productId: updated.id,
          url: img.url,
          altText: img.altText || null,
          position: img.position ?? i,
        })),
      })
    }
  }
  await appendAudit({
    actorId: user.id,
    action: 'product.update',
    entityType: 'product',
    entityId: updated.id,
    metadata: { title: updated.title },
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
  const existing = await db.product.findUnique({ where: { slug } })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await db.product.delete({ where: { id: existing.id } })
  await appendAudit({
    actorId: user.id,
    action: 'product.delete',
    entityType: 'product',
    entityId: existing.id,
    metadata: { title: existing.title },
    ipAddress: clientIp(req),
  })
  return NextResponse.json({ ok: true })
}
