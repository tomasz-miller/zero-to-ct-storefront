import { isIP } from 'node:net';

import { NextResponse } from 'next/server';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type FixedWindowLimiterOptions = {
  limit: number;
  windowMs: number;
  /**
   * Upper bound on tracked keys. Expired counters are evicted first; counters still inside
   * their window are never dropped. At the bound, new keys that cannot get their own counter
   * share one overflow counter with the rule's limit and window, so traffic beyond capacity
   * stays bounded and new visitors get some attempts per window. A sustained flood of new
   * keys can spend that budget and lock new visitors out on this instance until it subsides;
   * the Vercel WAF rule is the defence for that case.
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
  // Shared by every key that cannot get its own counter. Never evicted for room and not
  // part of `entries`, so it does not count toward `maxKeys`.
  let overflow: Entry | undefined;

  const isExpired = (entry: Entry, now: number) => now - entry.windowStart >= windowMs;

  const denied = (entry: Entry, now: number): RateLimitResult => ({
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000)),
  });

  /** Frees room for one new key by dropping expired counters; false when every counter is live. */
  function makeRoom(now: number): boolean {
    if (entries.size < maxKeys) return true;
    for (const [key, entry] of entries) {
      if (isExpired(entry, now)) entries.delete(key);
    }
    return entries.size < maxKeys;
  }

  /** Counts one attempt on the shared overflow counter. */
  function consumeOverflow(now: number): RateLimitResult {
    if (!overflow || isExpired(overflow, now)) {
      overflow = { windowStart: now, count: 1 };
      return { allowed: true };
    }
    if (overflow.count >= limit) return denied(overflow, now);
    overflow.count += 1;
    return { allowed: true };
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
      if (!makeRoom(now)) return consumeOverflow(now);
      entries.set(key, { windowStart: now, count: 1 });
      return { allowed: true };
    },
    /**
     * Reports whether the next `consume` would be allowed, without counting. Only the key's
     * own counter is consulted; the shared overflow counter is not.
     */
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
      overflow = undefined;
    },
  };
}

/** Longest address kept as a rate-limit key (IPv6 is at most 45 characters). */
const MAX_CLIENT_KEY_LENGTH = 64;

/** Expands an IPv6 address (already validated by `isIP`) into its eight 16-bit groups. */
function ipv6Groups(address: string): number[] | null {
  let text = address;
  const tailStart = text.lastIndexOf(':') + 1;
  const tail = text.slice(tailStart);
  if (tail.includes('.')) {
    const [a, b, c, d] = tail.split('.').map(Number);
    text = `${text.slice(0, tailStart)}${(((a << 8) | b) >>> 0).toString(16)}:${(((c << 8) | d) >>> 0).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves[1] ? halves[1].split(':') : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 ? fill !== 0 : fill < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill('0'), ...rest].map(
    (group) => parseInt(group, 16),
  );
  return groups.length === 8 && groups.every((g) => Number.isInteger(g)) ? groups : null;
}

/**
 * Rate-limit key for one address: IPv6 collapses to its /64 prefix (a single host
 * routinely controls a whole /64 and could otherwise mint unlimited keys), an
 * IPv4-mapped IPv6 address becomes plain IPv4, a zone id is dropped. IPv4 and
 * anything that is not an address pass through unchanged.
 */
function clientKeyFor(candidate: string): string {
  const address = candidate.split('%')[0];
  if (isIP(address) !== 6) return candidate;
  const groups = ipv6Groups(address);
  if (!groups) return candidate;
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
  }
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(':')}::/64`;
}

/**
 * Client key for rate limits. On Vercel `x-forwarded-for` is overwritten by the
 * platform, so the first entry cannot be spoofed there. IPv6 clients share one key
 * per /64 prefix (`2001:db8:1:2::/64`). A value longer than 64 characters is not an
 * address: it shares the `unknown` bucket so a client cannot mint unbounded or
 * oversized keys.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return candidate.length > MAX_CLIENT_KEY_LENGTH ? 'unknown' : clientKeyFor(candidate);
}

export function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
