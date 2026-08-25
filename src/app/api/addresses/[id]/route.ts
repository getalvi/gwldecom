// PUT/DELETE /api/addresses/[id]
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const existing = await db.address.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const body = await req.json()
  if (body.isDefault) {
    await db.address.updateMany({
      where: { userId: user.id, id: { not: id } },
      data: { isDefault: false },
    })
  }
  const updated = await db.address.update({
    where: { id },
    data: {
      label: body.label ?? existing.label,
      fullName: body.fullName ?? existing.fullName,
      phone: body.phone ?? existing.phone,
      addressLine1: body.addressLine1 ?? existing.addressLine1,
      city: body.city ?? existing.city,
      district: body.district ?? existing.district,
      postalCode: body.postalCode ?? existing.postalCode,
      isDefault: body.isDefault ?? existing.isDefault,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  await db.address.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
