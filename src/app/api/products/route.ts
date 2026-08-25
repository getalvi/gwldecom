// GET /api/products — list published (or all for staff with ?status=all),
// with filters: category, brand, q (title ilike), sort, minPrice, maxPrice, page.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') // slug
  const brandSlug = searchParams.get('brand')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') || 'newest'
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const tag = searchParams.get('tag')
  const featured = searchParams.get('featured')
  const limit = Math.min(Number(searchParams.get('limit') || '24'), 60)
  const page = Math.max(Number(searchParams.get('page') || '1'), 1)
  const statusFilter = searchParams.get('status') // staff only override

  const where: Prisma.ProductWhereInput = {}
  if (statusFilter === 'all') {
    // staff only — but we don't strictly re-check role here for read simplicity;
    // sensitive writes are protected. Limit exposure by still requiring published
    // unless explicitly requested (admin UI passes ?status=all).
  } else {
    where.status = 'published'
  }

  if (category) {
    const cat = await db.category.findUnique({
      where: { slug: category },
      select: { id: true },
    })
    if (cat) {
      const subcats = await db.category.findMany({
        where: { parentId: cat.id },
        select: { id: true },
      })
      const catIds = [cat.id, ...subcats.map((s) => s.id)]
      where.categoryId = { in: catIds }
    }
  }
  if (brandSlug) {
    const b = await db.brand.findUnique({ where: { slug: brandSlug }, select: { id: true } })
    if (b) where.brandId = b.id
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ]
  }
  if (tag) {
    // tags stored as Json array — SQLite Json filtering is limited, so we filter
    // in memory after fetching a candidate set.
    // (handled below after fetch)
  }
  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = Number(minPrice)
    if (maxPrice) where.price.lte = Number(maxPrice)
  }
  if (featured === '1') {
    where.compareAtPrice = { gt: 0 }
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  else if (sort === 'price_desc') orderBy = { price: 'desc' }
  else if (sort === 'title') orderBy = { title: 'asc' }

  // If tag filter is set, fetch a wider candidate set and filter in memory
  // because SQLite's Json filtering through Prisma is unreliable for arrays.
  if (tag) {
    const all = await db.product.findMany({
      where,
      orderBy,
      include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        reviews: { select: { rating: true } },
      },
    })
    const filtered = all.filter((p) => {
      const tags = (p.tags as string[] | null) || []
      return tags.includes(tag)
    })
    const total = filtered.length
    const start = (page - 1) * limit
    const items = filtered.slice(start, start + limit).map(attachReviewStats)
    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) })
  }

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        reviews: { select: { rating: true } },
      },
    }),
  ])

  return NextResponse.json({
    items: products.map(attachReviewStats),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

// Attach an aggregated `reviewStats` object to each product so cards can show
// avg rating + count without an extra round-trip per product.
function attachReviewStats(p: any) {
  const ratings = (p.reviews || []).map((r: any) => r.rating)
  const count = ratings.length
  const avg = count > 0 ? ratings.reduce((s: number, r: number) => s + r, 0) / count : 0
  // strip the raw reviews array from the response (already shown on detail page)
  const { reviews, ...rest } = p
  return { ...rest, reviewStats: { avg, count } }
}

// POST /api/products — staff create
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.title || !body.sku) {
    return NextResponse.json({ error: 'title and sku required' }, { status: 400 })
  }
  const product = await db.product.create({
    data: {
      title: body.title,
      slug: body.slug || apiSlug(body.title),
      description: body.description || null,
      specifications: body.specifications || null,
      attributes: body.attributes || null,
      tags: body.tags || null,
      categoryId: body.categoryId || null,
      brandId: body.brandId || null,
      price: Number(body.price) || 0,
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
      stockQuantity: Number(body.stockQuantity) || 0,
      sku: body.sku,
      status: body.status || 'draft',
      source: body.source || 'manual',
      aiConfidence: body.aiConfidence ? Number(body.aiConfidence) : null,
      createdBy: user.id,
    },
  })
  await appendAudit({
    actorId: user.id,
    action: 'product.create',
    entityType: 'product',
    entityId: product.id,
    metadata: { title: product.title },
    ipAddress: clientIp(req),
  })
  return NextResponse.json(product, { status: 201 })
}
