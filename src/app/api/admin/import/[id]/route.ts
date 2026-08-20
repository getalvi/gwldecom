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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params

    const job = await db.importJob.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Import job GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const updateItemSchema = z.object({
  status: z.enum(['approved', 'rejected']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: jobId } = await params
    const body = await request.json()
    const parsed = updateItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Single item update requires itemId
    if (body.itemId) {
      const item = await db.importItem.findUnique({
        where: { id: body.itemId },
      })

      if (!item || item.jobId !== jobId) {
        return NextResponse.json(
          { error: 'Import item not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      await db.importItem.update({
        where: { id: body.itemId },
        data: { status: parsed.data.status },
      })

      // If approved, create product from extracted data
      if (parsed.data.status === 'approved' && item.extracted) {
        const data = JSON.parse(item.extracted) as Record<string, unknown>
        const title = (data.title as string) || 'Imported Product'
        const slug = slugify(title) + '-' + Date.now()

        const product = await db.product.create({
          data: {
            title,
            slug,
            description: (data.description as string) || '',
            price: (data.price as number) || 0,
            compareAtPrice: (data.compareAtPrice as number) || null,
            currency: (data.currency as string) || 'BDT',
            status: 'draft',
            source: 'ai_import',
            aiConfidence: item.confidence || 0.5,
            specifications: data.specifications ? JSON.stringify(data.specifications) : '{}',
            tags: data.tags ? JSON.stringify(data.tags) : '[]',
            images: {
              create: ((data.images as string[]) || []).map((url, i) => ({
                url,
                position: i,
              })),
            },
          },
        })

        await db.importItem.update({
          where: { id: body.itemId },
          data: { resultingProductId: product.id, status: 'imported' },
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Item ID required for single update', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Import job PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

const bulkActionSchema = z.object({
  action: z.enum(['approve_all', 'reject_all']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || (userRole !== 'admin' && userRole !== 'staff')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: jobId } = await params
    const body = await request.json()
    const parsed = bulkActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const job = await db.importJob.findUnique({
      where: { id: jobId },
      include: { items: true },
    })
    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const newStatus = parsed.data.action === 'approve_all' ? 'approved' : 'rejected'

    // Update all pending/preview items
    await db.importItem.updateMany({
      where: {
        jobId,
        status: { in: ['pending', 'preview'] },
      },
      data: { status: newStatus },
    })

    // If approve_all, create products for approved items with extracted data
    if (parsed.data.action === 'approve_all') {
      const itemsToImport = await db.importItem.findMany({
        where: {
          jobId,
          status: 'approved',
          extracted: { not: null },
          resultingProductId: null,
        },
      })

      for (const item of itemsToImport) {
        try {
          const data = JSON.parse(item.extracted!) as Record<string, unknown>
          const title = (data.title as string) || 'Imported Product'
          const slug = slugify(title) + '-' + Date.now() + Math.random().toString(36).substring(7)

          const product = await db.product.create({
            data: {
              title,
              slug,
              description: (data.description as string) || '',
              price: (data.price as number) || 0,
              compareAtPrice: (data.compareAtPrice as number) || null,
              currency: (data.currency as string) || 'BDT',
              status: 'draft',
              source: 'ai_import',
              aiConfidence: item.confidence || 0.5,
              specifications: data.specifications ? JSON.stringify(data.specifications) : '{}',
              tags: data.tags ? JSON.stringify(data.tags) : '[]',
              images: {
                create: ((data.images as string[]) || []).map((url, i) => ({
                  url,
                  position: i,
                })),
              },
            },
          })

          await db.importItem.update({
            where: { id: item.id },
            data: { resultingProductId: product.id, status: 'imported' },
          })
        } catch (err) {
          console.error(`Failed to import item ${item.id}:`, err)
          await db.importItem.update({
            where: { id: item.id },
            data: { status: 'failed', errorMessage: 'Failed to create product' },
          })
        }
      }
    }

    // Update job status
    await db.importJob.update({
      where: { id: jobId },
      data: { status: 'completed', completedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import job POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
