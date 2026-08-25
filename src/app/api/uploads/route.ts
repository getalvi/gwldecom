// POST /api/uploads — staff upload an image. Saves to /public/uploads and
// returns the public URL. Replaces the Supabase Storage `product-images` bucket.
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { requireStaff } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const name = `${randomUUID()}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), buf)
  return NextResponse.json({ url: `/uploads/${name}` })
}
