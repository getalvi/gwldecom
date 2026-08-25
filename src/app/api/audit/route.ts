// GET /api/audit (admin only) — paginated audit log viewer.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { id: true, email: true, fullName: true } } },
  })
  return NextResponse.json(logs)
}
