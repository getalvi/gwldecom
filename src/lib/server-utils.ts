// Small server-only utilities shared across API routes.
import { db } from '@/lib/db'

export function apiSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function appendAudit(opts: {
  actorId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: opts.actorId ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        metadata: (opts.metadata ?? null) as never,
        ipAddress: opts.ipAddress ?? null,
      },
    })
  } catch {
    // audit failures must never break the request
  }
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]
  return req.headers.get('x-real-ip')
}

/** Atomic stock decrement — equivalent to the Supabase decrement_stock RPC. */
export async function decrementStock(productId: string, qty: number): Promise<boolean> {
  // Only decrement if enough stock remains (atomic with conditional update).
  const updated = await db.product.updateMany({
    where: { id: productId, stockQuantity: { gte: qty } },
    data: { stockQuantity: { decrement: qty } },
  })
  return updated.count > 0
}
