// GET /api/import-jobs (staff) — list import jobs with items/logs counts.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth'

export async function GET() {
  try {
    await requireStaff()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const jobs = await db.importJob.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true, logs: true } },
    },
  })
  return NextResponse.json(jobs)
}
