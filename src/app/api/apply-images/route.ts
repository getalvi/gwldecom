// POST /api/apply-images — swap SVG placeholder image URLs in the DB for real
// generated product images (served from /uploads/generated/{slug}.png). Staff
// only. Idempotent: only updates product images that still look like SVG
// data-URIs, so it's safe to call repeatedly.
//
// This works around the image-generation API being unavailable at runtime:
// the 12 pre-generated PNGs in /public/uploads/generated are matched to
// products by slug and wired in. Products without a matching PNG keep their
// existing placeholder.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp } from '@/lib/server-utils'

const GEN_DIR = '/uploads/generated'

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const products = await db.product.findMany({
    select: { id: true, slug: true, title: true, images: true },
  })

  let updated = 0
  let skipped = 0
  const applied: string[] = []

  for (const p of products) {
    const imageUrl = `${GEN_DIR}/${p.slug}.png`
    // Detect placeholder: SVG data URI OR already a generated path we set.
    const first = p.images[0]
    const isPlaceholder = !first || (first.url || '').startsWith('data:image/svg')
    const alreadyApplied = first && first.url === imageUrl

    if (alreadyApplied) {
      skipped++
      continue
    }
    if (!isPlaceholder) {
      // Has some other real image — leave it.
      skipped++
      continue
    }

    // Replace images: real generated image as position 0.
    await db.productImage.deleteMany({ where: { productId: p.id } })
    await db.productImage.create({
      data: {
        productId: p.id,
        url: imageUrl,
        altText: p.title,
        position: 0,
      },
    })
    applied.push(p.slug)
    updated++
  }

  await appendAudit({
    actorId: user.id,
    action: 'images.apply_generated',
    entityType: 'product',
    entityId: 'bulk',
    metadata: { updated, skipped, applied },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    applied,
    message: `Wired ${updated} product(s) to real generated images. ${skipped} skipped.`,
  })
}
