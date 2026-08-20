import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const createCouponSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0, 'Value must be non-negative'),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  active: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validate = searchParams.get('validate')
    const code = searchParams.get('code')
    const subtotalStr = searchParams.get('subtotal')

    // Coupon validation for checkout
    if (validate === 'true' && code) {
      const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } })
      if (!coupon || !coupon.active) {
        return NextResponse.json(
          { valid: false, error: 'Invalid or inactive coupon' },
          { status: 200 }
        )
      }
      const now = new Date()
      if (coupon.expiresAt && coupon.expiresAt < now) {
        return NextResponse.json(
          { valid: false, error: 'Coupon has expired' },
          { status: 200 }
        )
      }
      if (coupon.startsAt && coupon.startsAt > now) {
        return NextResponse.json(
          { valid: false, error: 'Coupon is not yet active' },
          { status: 200 }
        )
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { valid: false, error: 'Coupon usage limit reached' },
          { status: 200 }
        )
      }
      if (subtotalStr) {
        const subtotal = parseFloat(subtotalStr)
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          return NextResponse.json(
            { valid: false, error: `Minimum order of ${coupon.minOrderAmount} required` },
            { status: 200 }
          )
        }
      }
      return NextResponse.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          maxDiscount: coupon.maxDiscount,
          minOrderAmount: coupon.minOrderAmount,
        },
      })
    }

    // Admin list
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Coupons GET error:', error)
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

    if (!session || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createCouponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const existingCode = await db.coupon.findUnique({ where: { code: data.code.toUpperCase() } })
    if (existingCode) {
      return NextResponse.json(
        { error: 'Coupon code already exists', code: 'CODE_EXISTS' },
        { status: 409 }
      )
    }

    const coupon = await db.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        maxUses: data.maxUses,
        perUserLimit: data.perUserLimit,
        productIds: data.productIds ? JSON.stringify(data.productIds) : undefined,
        categoryIds: data.categoryIds ? JSON.stringify(data.categoryIds) : undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        active: data.active ?? true,
      },
    })

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error) {
    console.error('Coupons POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

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
        { error: 'Coupon ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (data.code !== undefined) updateData.code = (data.code as string).toUpperCase()
    if (data.type !== undefined) updateData.type = data.type
    if (data.value !== undefined) updateData.value = data.value
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses
    if (data.perUserLimit !== undefined) updateData.perUserLimit = data.perUserLimit
    if (data.productIds !== undefined) updateData.productIds = JSON.stringify(data.productIds)
    if (data.categoryIds !== undefined) updateData.categoryIds = JSON.stringify(data.categoryIds)
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt as string) : null
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : null
    if (data.active !== undefined) updateData.active = data.active

    const coupon = await db.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error('Coupons PATCH error:', error)
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
        { error: 'Coupon ID required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    await db.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Coupons DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
