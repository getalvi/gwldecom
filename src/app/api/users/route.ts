// GET /api/users (admin only) — list users. PATCH role.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const users = await db.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { id, role } = await req.json()
  if (!id || !['admin', 'staff', 'customer'].includes(role)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const updated = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true },
  })
  await appendAudit({
    actorId: user.id,
    action: 'user.role_change',
    entityType: 'user',
    entityId: id,
    metadata: { role },
    ipAddress: clientIp(req),
  })
  return NextResponse.json(updated)
}
