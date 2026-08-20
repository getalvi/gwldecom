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

const createProductSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  specifications: z.string().optional(),
  tags: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().min(0).optional(),
  currency: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  sku: z.string().optional(),
  status: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isDigital: z.boolean().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  shippingInfo: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  videoUrl: z.string().optional(),
  images: z.array(z.object({
    url: z.string(),
    altText: z.string().optional(),
    position: z.number().optional(),
  })).optional(),
  variants: z.array(z.object({
    name: z.string(),
    sku: z.string().optional(),
    price: z.number().optional(),
    stockQuantity: z.number().int().min(0).optional(),
    attributes: z.string().optional(),
    image: z.string().optional(),
    position: z.number().optional(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
    const isAdmin = userRole === 'admin' || userRole === 'staff'

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const rating = searchParams.get('rating')
    const featured = searchParams.get('featured')
    const bestSeller = searchParams.get('bestSeller')
    const newArrival = searchParams.get('newArrival')
    const trending = searchParams.get('trending')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (!isAdmin) {
      where.status = 'published'
    } else if (status) {
      where.status = status
    }

    if (category) {
      where.categoryId = category
    }
    if (brand) {
      where.brandId = brand
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (minPrice || maxPrice) {
      where.price = {} as Record<string, unknown>
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice)
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice)
    }
    if (featured === 'true') where.isFeatured = true
    if (bestSeller === 'true') where.isBestSeller = true
    if (newArrival === 'true') where.isNewArrival = true
    if (trending === 'true') where.isTrending = true

    let ratingFilter: Record<string, unknown> | undefined
    if (rating) {
      const ratingNum = parseInt(rating, 10)
      ratingFilter = { gte: ratingNum }
    }

    const orderBy: Record<string, string> = {}
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc'
        break
      case 'price_desc':
        orderBy.price = 'desc'
        break
      case 'popular':
        orderBy.createdAt = 'desc'
        break
      case 'newest':
      default:
        orderBy.createdAt = 'desc'
        break
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          images: { orderBy: { position: 'asc' } },
          variants: { orderBy: { position: 'asc' } },
          _count: { select: { reviews: true } },
          reviews: ratingFilter
            ? {
                select: { rating: true },
                where: { rating: ratingFilter },
              }
            : {
                select: { rating: true },
              },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    const productsWithAvgRating = products.map((p) => {
      const { reviews, _count, ...rest } = p as Record<string, unknown>
      const reviewList = reviews as Array<{ rating: number }>
      const avgRating = reviewList.length > 0
        ? Math.round((reviewList.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewList.length) * 10) / 10
        : 0
      return {
        ...rest,
        avgRating,
        reviewCount: (_count as { reviews: number }).reviews,
      }
    })

    return NextResponse.json({
      products: productsWithAvgRating,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const slug = slugify(data.title)

    // Check slug uniqueness
    const existingSlug = await db.product.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Product with similar title already exists', code: 'SLUG_EXISTS' },
        { status: 409 }
      )
    }

    const { images, variants, ...productData } = data

    const product = await db.product.create({
      data: {
        ...productData,
        slug,
        publishedAt: data.status === 'published' ? new Date() : null,
        images: images
          ? {
              create: images.map((img, i) => ({
                url: img.url,
                altText: img.altText,
                position: img.position ?? i,
              })),
            }
          : undefined,
        variants: variants
          ? {
              create: variants.map((v, i) => ({
                name: v.name,
                sku: v.sku,
                price: v.price,
                stockQuantity: v.stockQuantity ?? 0,
                attributes: v.attributes || '{}',
                image: v.image,
                position: v.position ?? i,
              })),
            }
          : undefined,
      },
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
        action: 'product.create',
        entityType: 'Product',
        entityId: product.id,
        metadata: JSON.stringify({ title: product.title, slug }),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Products POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
