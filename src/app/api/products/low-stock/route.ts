// GET /api/products/low-stock — staff list of products at or below threshold
// (default 5). Used by the admin dashboard low-stock widget.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const threshold = Math.max(0, Number(searchParams.get('threshold') || '5'))

  const products = await db.product.findMany({
    where: { stockQuantity: { lte: threshold }, status: { in: ['published', 'draft'] } },
    orderBy: [{ stockQuantity: 'asc' }, { title: 'asc' }],
    take: 10,
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      price: true,
      stockQuantity: true,
      status: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  })

  return NextResponse.json({ items: products, threshold })
}
