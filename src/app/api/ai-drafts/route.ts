// GET /api/ai-drafts (staff) — list AI import drafts. PATCH approve/reject.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

export async function GET() {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const drafts = await db.aiImportDraft.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(drafts)
}

export async function PATCH(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { id, action } = await req.json()
  const draft = await db.aiImportDraft.findUnique({ where: { id } })
  if (!draft) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (action === 'approve') {
    const data = (draft.extractedData as Record<string, unknown>) || {}
    const title = String(data.title || 'Untitled AI product')
    const product = await db.product.create({
      data: {
        title,
        slug: apiSlug(title) + '-' + id.slice(0, 6),
        description: (data.description as string) || null,
        price: Number(data.price) || 0,
        stockQuantity: Number(data.stock) || 0,
        sku: 'AI-' + id.slice(0, 8),
        status: 'published',
        source: 'ai_import',
        aiConfidence: data.confidence ? Number(data.confidence) : null,
        createdBy: user.id,
      },
    })
    await db.aiImportDraft.update({ where: { id }, data: { status: 'approved' } })
    await appendAudit({
      actorId: user.id,
      action: 'ai_draft.approve',
      entityType: 'product',
      entityId: product.id,
      ipAddress: clientIp(req),
    })
    return NextResponse.json({ ok: true, productId: product.id })
  }
  if (action === 'reject') {
    await db.aiImportDraft.update({ where: { id }, data: { status: 'rejected' } })
    await appendAudit({
      actorId: user.id,
      action: 'ai_draft.reject',
      entityType: 'ai_draft',
      entityId: id,
      ipAddress: clientIp(req),
    })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
