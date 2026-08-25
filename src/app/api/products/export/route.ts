// GET /api/products/export — staff-only. Exports all products to CSV.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(_req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const products = await db.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  })

  const header = [
    'title',
    'slug',
    'sku',
    'price',
    'compareAtPrice',
    'stockQuantity',
    'category',
    'brand',
    'status',
    'source',
    'description',
    'imageUrl',
    'createdAt',
  ]

  const rows = products.map((p) =>
    [
      p.title,
      p.slug,
      p.sku,
      p.price.toFixed(2),
      p.compareAtPrice ? p.compareAtPrice.toFixed(2) : '',
      String(p.stockQuantity),
      p.category?.name || '',
      p.brand?.name || '',
      p.status,
      p.source,
      p.description || '',
      p.images?.[0]?.url || '',
      new Date(p.createdAt).toISOString(),
    ].map(csvEscape).join(',')
  )

  const csv = [header.map(csvEscape).join(','), ...rows].join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bdshop-products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
