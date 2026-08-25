// POST /api/auth/register — email/password signup. Auto-creates profile row.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json()
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'Email and a 6+ char password are required' }, { status: 400 })
  }
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      fullName: fullName || null,
      role: 'customer',
      profile: {
        create: {
          email: email.toLowerCase(),
          fullName: fullName || null,
          role: 'customer',
        },
      },
    },
  })
  await createSession({
    id: user.id,
    email: user.email,
    role: 'customer',
    fullName: user.fullName,
  })
  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: 'customer',
    fullName: user.fullName,
  })
}
