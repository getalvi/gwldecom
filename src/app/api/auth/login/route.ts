// POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  await createSession({
    id: user.id,
    email: user.email,
    role: user.role as 'admin' | 'staff' | 'customer',
    fullName: user.fullName,
  })
  await appendAudit({
    actorId: user.id,
    action: 'login',
    entityType: 'user',
    entityId: user.id,
    ipAddress: clientIp(req),
  })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  })
}
