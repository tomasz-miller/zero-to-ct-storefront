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

  it('keeps blocking counters when maxKeys is reached and none expired', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 10_000);
    l.consume('c', 20_000); // overflow bucket, not a tracked key
    // The blocking counters were not evicted by the new key.
    expect(l.consume('a', 20_001)).toEqual({ allowed: false, retryAfterSeconds: 40 });
    expect(l.consume('b', 20_002)).toEqual({ allowed: false, retryAfterSeconds: 50 });
    // 'c' was not tracked; it gets its own counter once room is available again.
    expect(l.consume('c', 60_000)).toEqual({ allowed: true });
    expect(l.consume('c', 60_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('shares an overflow bucket among new keys when the map is full, then answers 429', () => {
    const l = createFixedWindowLimiter({ limit: 2, windowMs: 60_000, maxKeys: 2 });
    for (const key of ['a', 'b']) {
      l.consume(key, 0);
      l.consume(key, 1);
    }
    // Two untracked keys share the overflow limit of 2 ...
    expect(l.consume('c', 100)).toEqual({ allowed: true });
    expect(l.consume('d', 101)).toEqual({ allowed: true });
    // ... a third one (new or repeated) is refused with the overflow window's retry-after.
    expect(l.consume('e', 102)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.consume('c', 103)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // Existing counters are unaffected by the overflow traffic.
    expect(l.consume('a', 104)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.peek('a', 104)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    l.reset('a');
    // Resetting a tracked key frees room: the next new key gets its own counter again.
    expect(l.consume('e', 105)).toEqual({ allowed: true });
    expect(l.consume('e', 106)).toEqual({ allowed: true });
    expect(l.consume('e', 107)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('does not count the overflow bucket toward maxKeys', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
    l.consume('a', 0);
    expect(l.consume('b', 10)).toEqual({ allowed: true });
    expect(l.consume('c', 11)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // 'a' expires: it is evicted for 'd', and the overflow bucket does not take a slot.
    expect(l.consume('d', 60_000)).toEqual({ allowed: true });
    expect(l.consume('d', 60_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('resets the overflow bucket after its window', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 30_000);
    expect(l.consume('c', 40_000)).toEqual({ allowed: true });
    expect(l.consume('c', 40_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // Both counters are replaced by newer ones, so the map stays full of live counters.
    expect(l.consume('d', 60_000)).toEqual({ allowed: true });
    expect(l.consume('e', 90_000)).toEqual({ allowed: true });
    expect(l.consume('f', 99_999)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    // The overflow window (opened at 40_000) has passed: a new one starts.
    expect(l.consume('f', 100_000)).toEqual({ allowed: true });
    expect(l.consume('g', 100_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('clear drops the overflow bucket too', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
    l.consume('a', 0);
    l.consume('b', 1);
    expect(l.consume('c', 2)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    l.clear();
    l.consume('a', 3);
    expect(l.consume('b', 4)).toEqual({ allowed: true });
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
