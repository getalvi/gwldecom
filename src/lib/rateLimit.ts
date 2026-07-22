import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Free-tier friendly rate limiting.
 * - Production: Upstash Redis (free tier: 10k commands/day, serverless-safe).
 * - Local dev / no Redis configured: falls back to an in-memory limiter so
 *   the app still runs, with a console warning (never silently insecure in prod).
 */

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redisLimiters = new Map<string, Ratelimit>();
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function getRedisLimiter(key: string, limit: number, windowSeconds: number) {
  if (!redisLimiters.has(key)) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    redisLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `ratelimit:${key}`,
      })
    );
  }
  return redisLimiters.get(key)!;
}

function memoryLimit(bucketKey: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const bucket = memoryBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { success: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/**
 * @param identifier Unique caller key, e.g. `user:${userId}` or `ip:${ip}`
 * @param bucket Logical action name, e.g. "ai-extract", "product-create", "auth-login"
 */
export async function checkRateLimit(
  identifier: string,
  bucket: string,
  limit = 20,
  windowSeconds = 60
) {
  if (hasRedis) {
    const limiter = getRedisLimiter(bucket, limit, windowSeconds);
    const { success, remaining } = await limiter.limit(identifier);
    return { success, remaining };
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[rateLimit] UPSTASH_REDIS not configured in production — using in-memory fallback (not safe across serverless instances). Set UPSTASH_REDIS_REST_URL/TOKEN.`
    );
  }
  return memoryLimit(`${bucket}:${identifier}`, limit, windowSeconds);
}

/** Extracts a best-effort client IP from a Next.js Request for anonymous rate limiting. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
