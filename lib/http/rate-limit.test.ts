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

  it('evicts oldest keys beyond maxKeys', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 0);
    l.consume('c', 0);
    expect(l.consume('a', 1)).toEqual({ allowed: true }); // 'a' was evicted
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

  it('sets Retry-After on 429', () => {
    const r = tooManyRequestsResponse(42);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('42');
  });
});
