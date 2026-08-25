// POST /api/products/[slug]/clone — staff-only. Creates a copy of a product
// with "(Copy)" appended to the title, a new unique slug + SKU, status draft,
// and copies images/specs/attributes/tags/category/brand. Returns the new product.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const source = await db.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: 'asc' } } },
  })
  if (!source) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const newTitle = `${source.title} (Copy)`
  const baseSlug = apiSlug(newTitle)
  const newSlug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`
  const newSku = `${source.sku}-COPY-${Date.now().toString(36).slice(-4)}`.toUpperCase()

  // Ensure uniqueness (slug + sku are unique)
  const [slugOk, skuOk] = await Promise.all([
    db.product.findUnique({ where: { slug: newSlug } }),
    db.product.findUnique({ where: { sku: newSku } }),
  ])
  if (slugOk || skuOk) {
    return NextResponse.json({ error: 'Clone collision, please retry' }, { status: 409 })
  }

  const cloned = await db.product.create({
    data: {
      title: newTitle,
      slug: newSlug,
      description: source.description,
      specifications: source.specifications,
      attributes: source.attributes,
      tags: source.tags,
      categoryId: source.categoryId,
      brandId: source.brandId,
      price: source.price,
      compareAtPrice: source.compareAtPrice,
      stockQuantity: 0, // start at 0 so staff sets it
      sku: newSku,
      status: 'draft',
      source: 'manual',
      createdBy: user.id,
      images: source.images.length
        ? {
            create: source.images.map((img, i) => ({
              url: img.url,
              altText: img.altText,
              position: i,
            })),
          }
        : undefined,
    },
    include: { images: true },
  })

  await appendAudit({
    actorId: user.id,
    action: 'product.clone',
    entityType: 'product',
    entityId: cloned.id,
    metadata: { from: source.slug, to: cloned.slug, title: cloned.title },
    ipAddress: clientIp(req),
  })

  return NextResponse.json(cloned, { status: 201 })
}
