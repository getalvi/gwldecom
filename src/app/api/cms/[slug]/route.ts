import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const page = await db.cmsPage.findFirst({
      where: { slug, status: 'published' },
      select: {
        title: true,
        slug: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
      },
    })

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ page })
  } catch (error) {
    console.error('CMS page GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
