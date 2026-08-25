import "server-only";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(identifier: string, bucket: string, limit = 20, windowSeconds = 60) {
  const now = Date.now();
  const key = `${bucket}:${identifier}`;
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }
  existing.count += 1;
  return { success: existing.count <= limit, remaining: Math.max(0, limit - existing.count) };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
