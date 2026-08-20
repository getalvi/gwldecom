import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sort = searchParams.get('sort') || 'relevance'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { status: 'published' }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ]
    }

    if (category) where.categoryId = category
    if (brand) where.brandId = brand

    if (minPrice || maxPrice) {
      where.price = {} as Record<string, unknown>
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice)
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice)
    }

    const orderBy: Record<string, string> = {}
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc'
        break
      case 'price_desc':
        orderBy.price = 'desc'
        break
      case 'newest':
        orderBy.createdAt = 'desc'
        break
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
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    const productsWithRating = products.map((p) => {
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
      products: productsWithRating,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query: q,
    })
  } catch (error) {
    console.error('Search GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
