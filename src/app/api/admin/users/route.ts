import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }
    if (role) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          emailVerified: true,
          suspended: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    // Get total spent per user
    const userIds = users.map((u) => u.id)
    const spentData = userIds.length > 0
      ? await db.order.groupBy({
          by: ['customerId'],
          where: { customerId: { in: userIds } },
          _sum: { total: true },
        })
      : []
    const spentMap = Object.fromEntries(
      spentData.map((d) => [d.customerId, d._sum.total || 0])
    )

    const usersWithSpent = users.map((u) => ({
      ...u,
      totalSpent: spentMap[u.id] || 0,
    }))

    return NextResponse.json({
      users: usersWithSpent,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const updateUserSchema = z.object({
  role: z.string().optional(),
  suspended: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
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
    const { id, ...data } = body
    if (!id) {
      return NextResponse.json(
        { error: 'User ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const parsed = updateUserSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, suspended: true },
    })

    await db.auditLog.create({
      data: {
        actorId: (session.user as Record<string, unknown>).userId as string,
        action: 'user.update',
        entityType: 'User',
        entityId: id,
        metadata: JSON.stringify(parsed.data),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
