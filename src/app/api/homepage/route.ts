import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
    })
    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Homepage GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const createSectionSchema = z.object({
  type: z.string().min(1),
  title: z.string().optional(),
  config: z.string().optional(),
  position: z.number().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
})

export async function POST(request: NextRequest) {
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
    const parsed = createSectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const section = await db.homepageSection.create({
      data: {
        type: data.type,
        title: data.title,
        config: data.config || '{}',
        position: data.position ?? 0,
        active: data.active ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    console.error('Homepage POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const reorderSchema = z.object({
  sections: z.array(z.object({
    id: z.string(),
    position: z.number(),
    active: z.boolean().optional(),
    config: z.string().optional(),
  })),
})

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
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    for (const section of parsed.data.sections) {
      const updateData: Record<string, unknown> = { position: section.position }
      if (section.active !== undefined) updateData.active = section.active
      if (section.config !== undefined) updateData.config = section.config
      await db.homepageSection.update({
        where: { id: section.id },
        data: updateData,
      })
    }

    const sections = await db.homepageSection.findMany({
      orderBy: { position: 'asc' },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Homepage PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Section ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    await db.homepageSection.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Homepage DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
