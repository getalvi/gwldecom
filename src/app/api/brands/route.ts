import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const createBrandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  logo: z.string().optional(),
  active: z.boolean().optional(),
})

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('Brands GET error:', error)
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
    const parsed = createBrandSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const slug = data.slug || slugify(data.name)

    const existing = await db.brand.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Brand with this slug already exists', code: 'SLUG_EXISTS' },
        { status: 409 }
      )
    }

    const brand = await db.brand.create({
      data: {
        name: data.name,
        slug,
        logo: data.logo,
        active: data.active ?? true,
      },
      include: {
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    console.error('Brands POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}