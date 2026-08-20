import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if id looks like a slug (contains dashes and no cuid pattern)
    const isSlug = id.includes('-') && !id.startsWith('c')

    const where = isSlug ? { slug: id, status: 'published' } : { id }

    const product = await db.product.findFirst({
      where,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reviews: true } },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const { reviews, _count, ...rest } = product as Record<string, unknown>
    const reviewList = reviews as Array<{ rating: number }>
    const avgRating = reviewList.length > 0
      ? Math.round((reviewList.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewList.length) * 10) / 10
      : 0
    const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const r of reviewList) {
      if (ratingDist[r.rating] !== undefined) ratingDist[r.rating]++
    }

    return NextResponse.json({
      product: {
        ...rest,
        avgRating,
        reviewCount: (_count as { reviews: number }).reviews,
        ratingDistribution: ratingDist,
      },
    })
  } catch (error) {
    console.error('Product GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  specifications: z.string().optional(),
  tags: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().nullable().optional(),
  costPrice: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  sku: z.string().nullable().optional(),
  status: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isDigital: z.boolean().optional(),
  weight: z.number().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  shippingInfo: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoKeywords: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  images: z.array(z.object({
    id: z.string().optional(),
    url: z.string(),
    altText: z.string().optional(),
    position: z.number().optional(),
    _delete: z.boolean().optional(),
  })).optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    sku: z.string().optional(),
    price: z.number().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    attributes: z.string().optional(),
    image: z.string().optional(),
    position: z.number().optional(),
    _delete: z.boolean().optional(),
  })).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const data = parsed.data
    const { images, variants, ...productData } = data

    let slug = existing.slug
    if (data.title && data.title !== existing.title) {
      slug = slugify(data.title)
      const slugExists = await db.product.findFirst({
        where: { slug, id: { not: id } },
      })
      if (slugExists) {
        slug = `${slug}-${Date.now()}`
      }
    }

    const wasPublished = existing.status === 'published'
    const willBePublished = data.status === 'published'
    const publishedAt = !wasPublished && willBePublished
      ? new Date()
      : data.status === 'published'
        ? existing.publishedAt
        : undefined

    const product = await db.product.update({
      where: { id },
      data: {
        ...productData,
        slug,
        ...(publishedAt !== undefined ? { publishedAt } : (data.status && data.status !== 'published' ? { publishedAt: null } : {})),
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
      },
    })

    // Handle image updates
    if (images) {
      // Delete marked images
      const toDelete = images.filter((img) => img._delete && img.id)
      if (toDelete.length > 0) {
        await db.productImage.deleteMany({
          where: { id: { in: toDelete.map((img) => img.id!) } },
        })
      }
      // Upsert images with ids, create new ones without
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (img._delete) continue
        if (img.id) {
          await db.productImage.update({
            where: { id: img.id },
            data: { url: img.url, altText: img.altText, position: img.position ?? i },
          })
        } else {
          await db.productImage.create({
            data: { productId: id, url: img.url, altText: img.altText, position: img.position ?? i },
          })
        }
      }
    }

    // Handle variant updates
    if (variants) {
      const toDeleteVariants = variants.filter((v) => v._delete && v.id)
      if (toDeleteVariants.length > 0) {
        await db.productVariant.deleteMany({
          where: { id: { in: toDeleteVariants.map((v) => v.id!) } },
        })
      }
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        if (v._delete) continue
        if (v.id) {
          await db.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku,
              price: v.price,
              stockQuantity: v.stockQuantity ?? 0,
              attributes: v.attributes || '{}',
              image: v.image,
              position: v.position ?? i,
            },
          })
        } else {
          await db.productVariant.create({
            data: {
              productId: id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stockQuantity: v.stockQuantity ?? 0,
              attributes: v.attributes || '{}',
              image: v.image,
              position: v.position ?? i,
            },
          })
        }
      }
    }

    // Reload with updated relations
    const updated = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: (session.user as Record<string, unknown>).userId as string,
        action: 'product.update',
        entityType: 'Product',
        entityId: id,
        metadata: JSON.stringify({ changes: Object.keys(data) }),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('Product PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await db.product.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        actorId: (session.user as Record<string, unknown>).userId as string,
        action: 'product.delete',
        entityType: 'Product',
        entityId: id,
        metadata: JSON.stringify({ title: existing.title }),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Product DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
