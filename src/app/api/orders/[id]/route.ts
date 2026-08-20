import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const updateStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined
    const userId = (session?.user as Record<string, unknown>)?.userId as string | undefined

    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        coupon: { select: { id: true, code: true, type: true, value: true } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Customers can only see their own orders
    if (userRole !== 'admin' && userRole !== 'staff' && order.customerId !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

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

    const { id } = await params
    const body = await request.json()
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })

    // Create status history entry
    await db.orderStatusHistory.create({
      data: {
        orderId: id,
        status: parsed.data.status,
        note: parsed.data.note,
        trackingNumber: parsed.data.trackingNumber,
      },
    })

    // Restore inventory if cancelled or returned
    if (
      (parsed.data.status === 'cancelled' || parsed.data.status === 'returned' || parsed.data.status === 'refunded') &&
      (order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing')
    ) {
      for (const item of order.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        })
        if (item.variantId) {
          await db.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          })
        }
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: (session.user as Record<string, unknown>).userId as string,
        action: 'order.update_status',
        entityType: 'Order',
        entityId: id,
        metadata: JSON.stringify({
          from: order.status,
          to: parsed.data.status,
          note: parsed.data.note,
          trackingNumber: parsed.data.trackingNumber,
        }),
        ip: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    // Create notification for customer
    if (order.customerId) {
      await db.notification.create({
        data: {
          userId: order.customerId,
          type: 'order_shipped',
          title: `Order ${updated.orderNumber} Update`,
          message: `Your order status has been updated to ${parsed.data.status}.`,
          link: `/orders/${id}`,
        },
      })
    }

    return NextResponse.json({ order: updated })
  } catch (error) {
    console.error('Order PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
