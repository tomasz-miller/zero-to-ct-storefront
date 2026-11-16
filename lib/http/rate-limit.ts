import { NextResponse } from 'next/server';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type FixedWindowLimiterOptions = {
  limit: number;
  windowMs: number;
  /**
   * Upper bound on tracked keys. Expired counters are evicted first; counters still inside
   * their window are never dropped, so at the bound new keys are rejected (fail closed).
   */
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

  /** Frees room for one new key; returns the soonest retry-after when none can be freed. */
  function makeRoom(now: number): RateLimitResult {
    if (entries.size < maxKeys) return { allowed: true };
    let soonestExpiry = Infinity;
    for (const [key, entry] of entries) {
      if (isExpired(entry, now)) entries.delete(key);
      else soonestExpiry = Math.min(soonestExpiry, entry.windowStart + windowMs);
    }
    if (entries.size < maxKeys) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((soonestExpiry - now) / 1000)) };
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
      const room = makeRoom(now);
      if (!room.allowed) return room;
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

/** Longest address kept as a rate-limit key (IPv6 is at most 45 characters). */
const MAX_CLIENT_KEY_LENGTH = 64;

/**
 * Client address for rate-limit keys. On Vercel `x-forwarded-for` is
 * overwritten by the platform, so the first entry cannot be spoofed there.
 * A value longer than 64 characters is not an address: it shares the `unknown`
 * bucket so a client cannot mint unbounded or oversized keys.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return candidate.length > MAX_CLIENT_KEY_LENGTH ? 'unknown' : candidate;
}

export function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
