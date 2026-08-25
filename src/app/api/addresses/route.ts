// GET /api/addresses — list current user's. POST add.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function GET() {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(addresses)
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (!body.fullName || !body.phone || !body.addressLine1) {
    return NextResponse.json({ error: 'fullName, phone, addressLine1 required' }, { status: 400 })
  }
  if (body.isDefault) {
    await db.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    })
  }
  const address = await db.address.create({
    data: {
      userId: user.id,
      label: body.label || null,
      fullName: body.fullName,
      phone: body.phone,
      addressLine1: body.addressLine1,
      city: body.city || '',
      district: body.district || '',
      postalCode: body.postalCode || null,
      isDefault: body.isDefault ?? false,
    },
  })
  return NextResponse.json(address, { status: 201 })
}
