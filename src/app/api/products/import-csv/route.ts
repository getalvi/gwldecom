// POST /api/products/import-csv — staff-only bulk product import from CSV.
// Accepts multipart/form-data with a "file" field (CSV). Parses rows and
// creates products. Returns a summary of created/skipped/failed.
// CSV columns (header row required): title,sku,price,stock,category,brand,description,status
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'
import { appendAudit, clientIp, apiSlug } from '@/lib/server-utils'

type RowResult = { row: number; status: 'created' | 'failed'; title?: string; error?: string }

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells.map((c) => c.trim()))
  }
  return rows
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header row + at least 1 data row' }, { status: 400 })
  }

  const header = rows[0].map((h) => h.toLowerCase().trim())
  const colIdx = (name: string) => header.indexOf(name)
  const required = ['title', 'sku', 'price']
  for (const r of required) {
    if (colIdx(r) === -1) {
      return NextResponse.json({ error: `Missing required column: ${r}` }, { status: 400 })
    }
  }

  // Pre-fetch categories + brands for name→id mapping
  const [categories, brands] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.brand.findMany({ select: { id: true, name: true, slug: true } }),
  ])
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
  const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]))

  const results: RowResult[] = []
  let created = 0
  let failed = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const title = row[colIdx('title')]
    const sku = row[colIdx('sku')]
    const priceStr = row[colIdx('price')]

    if (!title || !sku || !priceStr) {
      results.push({ row: i, status: 'failed', error: 'Missing title/sku/price' })
      failed++
      continue
    }

    const price = Number(priceStr)
    if (Number.isNaN(price)) {
      results.push({ row: i, status: 'failed', error: 'Invalid price' })
      failed++
      continue
    }

    // Check SKU uniqueness
    const existing = await db.product.findUnique({ where: { sku } }).catch(() => null)
    if (existing) {
      results.push({ row: i, status: 'failed', title, error: 'SKU already exists' })
      failed++
      continue
    }

    const stock = colIdx('stock') >= 0 ? Number(row[colIdx('stock')]) || 0 : 0
    const catName = colIdx('category') >= 0 ? row[colIdx('category')] : ''
    const brandName = colIdx('brand') >= 0 ? row[colIdx('brand')] : ''
    const description = colIdx('description') >= 0 ? row[colIdx('description')] : null
    const status = colIdx('status') >= 0 ? row[colIdx('status')] : 'draft'

    try {
      const product = await db.product.create({
        data: {
          title,
          slug: `${apiSlug(title)}-${Date.now().toString(36).slice(-4)}`,
          sku,
          price,
          stockQuantity: stock,
          categoryId: catName ? catByName.get(catName.toLowerCase()) || null : null,
          brandId: brandName ? brandByName.get(brandName.toLowerCase()) || null : null,
          description: description || null,
          status: ['draft', 'published', 'pending_review', 'archived'].includes(status) ? status : 'draft',
          source: 'manual',
          createdBy: user.id,
        },
      })
      results.push({ row: i, status: 'created', title: product.title })
      created++
    } catch (e: any) {
      results.push({ row: i, status: 'failed', title, error: e.message || 'Create failed' })
      failed++
    }
  }

  await appendAudit({
    actorId: user.id,
    action: 'product.bulk_import',
    entityType: 'product',
    entityId: 'bulk',
    metadata: { created, failed, total: rows.length - 1 },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({ created, failed, total: rows.length - 1, results })
}
