// Server-side auth helpers: password hashing + JWT session cookies.
// In this sandbox we use Prisma + a signed cookie session (not NextAuth) so the
// whole app can live behind a single route while still enforcing roles server-side.

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'sb_session'
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-only-secret-change-me-in-production-please-32bytes'
)

export type SessionUser = {
  id: string
  email: string
  role: 'admin' | 'staff' | 'customer'
  fullName: string | null
}

export async function hashPassword(password: string): Promise<string> {
  const { hash } = await import('bcryptjs')
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  const { compare } = await import('bcryptjs')
  return compare(password, hashStr)
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

/** Throws if no session. Returns the session user. */
export async function requireSession(): Promise<SessionUser> {
  const s = await getSession()
  if (!s) throw new Error('UNAUTHORIZED')
  return s
}

/** Requires the session and that the role is admin or staff. */
export async function requireStaff(): Promise<SessionUser> {
  const s = await requireSession()
  if (s.role !== 'admin' && s.role !== 'staff') throw new Error('FORBIDDEN')
  return s
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireSession()
  if (s.role !== 'admin') throw new Error('FORBIDDEN')
  return s
}

/** Refresh the profile/role from DB (JWT may be stale). Returns null if user gone. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const s = await getSession()
  if (!s) return null
  const user = await db.user.findUnique({
    where: { id: s.id },
    select: { id: true, email: true, role: true, fullName: true },
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    role: user.role as SessionUser['role'],
    fullName: user.fullName,
  }
}
