import { NextResponse } from 'next/server';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type FixedWindowLimiterOptions = {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys; the oldest entries are evicted beyond it. */
  maxKeys?: number;
};

type Entry = { windowStart: number; count: number };

/**
 * In-memory fixed-window limiter. State lives in one process, so on serverless
 * it is per instance (best effort); pair it with a platform-level rule.
 */
export function createFixedWindowLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: FixedWindowLimiterOptions) {
  const entries = new Map<string, Entry>();

  const isExpired = (entry: Entry, now: number) => now - entry.windowStart >= windowMs;

  const denied = (entry: Entry, now: number): RateLimitResult => ({
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000)),
  });

  function makeRoom(now: number) {
    if (entries.size < maxKeys) return;
    for (const [key, entry] of entries) {
      if (isExpired(entry, now)) entries.delete(key);
    }
    while (entries.size >= maxKeys) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      entries.delete(oldest.value);
    }
  }

  return {
    /** Counts one attempt for `key` and reports whether it is within the limit. */
    consume(key: string, now: number = Date.now()): RateLimitResult {
      const existing = entries.get(key);
      if (existing && !isExpired(existing, now)) {
        if (existing.count >= limit) return denied(existing, now);
        existing.count += 1;
        return { allowed: true };
      }
      if (existing) entries.delete(key);
      makeRoom(now);
      entries.set(key, { windowStart: now, count: 1 });
      return { allowed: true };
    },
    /** Reports whether the next `consume` would be allowed, without counting. */
    peek(key: string, now: number = Date.now()): RateLimitResult {
      const existing = entries.get(key);
      if (!existing || isExpired(existing, now)) return { allowed: true };
      return existing.count >= limit ? denied(existing, now) : { allowed: true };
    },
    reset(key: string): void {
      entries.delete(key);
    },
    clear(): void {
      entries.clear();
    },
  };
}

/**
 * Client address for rate-limit keys. On Vercel `x-forwarded-for` is
 * overwritten by the platform, so the first entry cannot be spoofed there.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = request.headers.get('x-real-ip')?.trim();
  return real || 'unknown';
}

export function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
