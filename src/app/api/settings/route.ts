import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const settings = await db.storeSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }
    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Settings object required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const entries = Object.entries(body) as Array<[string, string]>
    for (const [key, value] of entries) {
      await db.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: (session.user as Record<string, unknown>).userId as string,
        action: 'settings.update',
        entityType: 'StoreSetting',
        metadata: JSON.stringify({ keys: Object.keys(body) }),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
