// DELETE /api/wishlist/[productId]
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  await db.wishlist.deleteMany({ where: { userId: user.id, productId } })
  return NextResponse.json({ ok: true })
}
