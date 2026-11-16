/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import {
  createFixedWindowLimiter,
  getClientIp,
  tooManyRequestsResponse,
} from './rate-limit';

describe('rate-limit', () => {
  it('allows up to limit within the window and reports retry-after', () => {
    const l = createFixedWindowLimiter({ limit: 2, windowMs: 60_000 });
    expect(l.consume('k', 0)).toEqual({ allowed: true });
    l.consume('k', 1);
    expect(l.consume('k', 2)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.consume('k', 60_001)).toEqual({ allowed: true });
  });

  it('evicts expired counters first when maxKeys is reached', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 30_000);
    // 'a' has expired at 60_000, 'b' has not: only 'a' is dropped to make room.
    expect(l.consume('c', 60_000)).toEqual({ allowed: true });
    expect(l.consume('b', 60_001)).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it('keeps blocking counters and rejects new keys when maxKeys is reached and none expired', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 10_000);
    expect(l.consume('c', 20_000)).toEqual({ allowed: false, retryAfterSeconds: 40 });
    // The blocking counters were not evicted by the new key.
    expect(l.consume('a', 20_001)).toEqual({ allowed: false, retryAfterSeconds: 40 });
    expect(l.consume('b', 20_002)).toEqual({ allowed: false, retryAfterSeconds: 50 });
    // 'c' was not tracked; it is allowed once room is available again.
    expect(l.consume('c', 60_000)).toEqual({ allowed: true });
  });

  it('derives client ip from first x-forwarded-for entry', () => {
    expect(
      getClientIp(
        new Request('http://x', { headers: { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' } }),
      ),
    ).toBe('1.1.1.1');
    expect(getClientIp(new Request('http://x', { headers: { 'x-real-ip': '2.2.2.2' } }))).toBe(
      '2.2.2.2',
    );
    expect(getClientIp(new Request('http://x'))).toBe('unknown');
  });

  it('caps the derived client key length and falls back to the unknown bucket', () => {
    const long = 'a'.repeat(65);
    expect(
      getClientIp(new Request('http://x', { headers: { 'x-forwarded-for': `${'b'.repeat(64)}, 1.1.1.1` } })),
    ).toBe('b'.repeat(64));
    expect(getClientIp(new Request('http://x', { headers: { 'x-forwarded-for': long } }))).toBe(
      'unknown',
    );
    expect(getClientIp(new Request('http://x', { headers: { 'x-forwarded-for': `${long}, 1.1.1.1` } }))).toBe(
      'unknown',
    );
    expect(getClientIp(new Request('http://x', { headers: { 'x-real-ip': long } }))).toBe('unknown');
  });

  it('sets Retry-After on 429', () => {
    const r = tooManyRequestsResponse(42);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('42');
  });
});
