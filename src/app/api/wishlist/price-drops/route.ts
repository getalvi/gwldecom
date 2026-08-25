// GET /api/wishlist/price-drops — returns wishlist items whose current price
// is lower than their compareAtPrice (i.e. on sale / price dropped). Auth required.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const items = await db.wishlist.findMany({
    where: {
      userId: user.id,
      product: {
        status: 'published',
        compareAtPrice: { gt: 0 },
      },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          stockQuantity: true,
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  // Filter to only items where current price < compareAtPrice (on sale)
  const drops = items
    .filter((i) => i.product.compareAtPrice && i.product.compareAtPrice > i.product.price)
    .map((i) => {
      const discount = i.product.compareAtPrice! - i.product.price
      const discountPct = Math.round((discount / i.product.compareAtPrice!) * 100)
      return { ...i.product, wishlistId: i.id, discount, discountPct }
    })
  return NextResponse.json({ items: drops, count: drops.length })
}
