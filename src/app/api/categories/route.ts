import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  parentId: z.string().nullable().optional(),
  image: z.string().optional(),
  position: z.number().optional(),
  active: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parent = searchParams.get('parent')

    const where: Record<string, unknown> = {}
    if (parent === 'null' || parent === '') {
      where.parentId = null
    } else if (parent) {
      where.parentId = parent
    }

    const categories = await db.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: { position: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const slug = data.slug || slugify(data.name)

    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Category with this slug already exists', code: 'SLUG_EXISTS' },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        parentId: data.parentId ?? null,
        image: data.image,
        position: data.position ?? 0,
        active: data.active ?? true,
      },
      include: {
        parent: true,
        _count: { select: { products: true, children: true } },
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
