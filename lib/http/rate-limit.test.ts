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
    expect(l.consume('k', 0)).toMatchObject({ allowed: true });
    l.consume('k', 1);
    expect(l.consume('k', 2)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.consume('k', 60_001)).toMatchObject({ allowed: true });
  });

  it('evicts expired counters first when maxKeys is reached', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 30_000);
    // 'a' has expired at 60_000, 'b' has not: only 'a' is dropped to make room.
    expect(l.consume('c', 60_000)).toMatchObject({ allowed: true });
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
    expect(l.consume('c', 60_000)).toMatchObject({ allowed: true });
    expect(l.consume('c', 60_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('shares an overflow bucket among new keys when the map is full, then answers 429', () => {
    const l = createFixedWindowLimiter({ limit: 2, windowMs: 60_000, maxKeys: 2 });
    for (const key of ['a', 'b']) {
      l.consume(key, 0);
      l.consume(key, 1);
    }
    // Two untracked keys share the overflow limit of 2 ...
    expect(l.consume('c', 100)).toMatchObject({ allowed: true });
    expect(l.consume('d', 101)).toMatchObject({ allowed: true });
    // ... a third one (new or repeated) is refused with the overflow window's retry-after.
    expect(l.consume('e', 102)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.consume('c', 103)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // Existing counters are unaffected by the overflow traffic.
    expect(l.consume('a', 104)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(l.peek('a', 104)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    l.reset('a');
    // Resetting a tracked key frees room: the next new key gets its own counter again.
    expect(l.consume('e', 105)).toMatchObject({ allowed: true });
    expect(l.consume('e', 106)).toMatchObject({ allowed: true });
    expect(l.consume('e', 107)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('does not count the overflow bucket toward maxKeys', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
    l.consume('a', 0);
    expect(l.consume('b', 10)).toMatchObject({ allowed: true });
    expect(l.consume('c', 11)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // 'a' expires: it is evicted for 'd', and the overflow bucket does not take a slot.
    expect(l.consume('d', 60_000)).toMatchObject({ allowed: true });
    expect(l.consume('d', 60_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('resets the overflow bucket after its window', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.consume('a', 0);
    l.consume('b', 30_000);
    expect(l.consume('c', 40_000)).toMatchObject({ allowed: true });
    expect(l.consume('c', 40_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    // Both counters are replaced by newer ones, so the map stays full of live counters.
    expect(l.consume('d', 60_000)).toMatchObject({ allowed: true });
    expect(l.consume('e', 90_000)).toMatchObject({ allowed: true });
    expect(l.consume('f', 99_999)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    // The overflow window (opened at 40_000) has passed: a new one starts.
    expect(l.consume('f', 100_000)).toMatchObject({ allowed: true });
    expect(l.consume('g', 100_001)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('clear drops the overflow bucket too', () => {
    const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
    l.consume('a', 0);
    l.consume('b', 1);
    expect(l.consume('c', 2)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    l.clear();
    l.consume('a', 3);
    expect(l.consume('b', 4)).toMatchObject({ allowed: true });
  });

  describe('release', () => {
    it('reports where a consumed hit landed', () => {
      const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
      expect(l.consume('a', 0)).toMatchObject({ allowed: true, slot: { where: 'key' } });
      expect(l.consume('b', 1)).toMatchObject({ allowed: true, slot: { where: 'overflow' } });
      expect(l.consume('a', 2)).not.toHaveProperty('slot');
    });

    it('undoes one consumed hit for the key', () => {
      const l = createFixedWindowLimiter({ limit: 2, windowMs: 60_000 });
      const first = l.consume('k', 0);
      l.consume('k', 1);
      expect(l.consume('k', 2)).toMatchObject({ allowed: false });
      if (!first.allowed) throw new Error('expected an allowed hit');
      l.release('k', first.slot);
      expect(l.consume('k', 3)).toMatchObject({ allowed: true });
      expect(l.consume('k', 4)).toMatchObject({ allowed: false });
    });

    it('frees the key entirely when its only hit is released', () => {
      const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
      const hit = l.consume('a', 0);
      if (!hit.allowed) throw new Error('expected an allowed hit');
      l.release('a', hit.slot);
      // Room again: 'b' gets its own counter instead of the overflow.
      expect(l.consume('b', 1)).toMatchObject({ allowed: true, slot: { where: 'key' } });
    });

    it('undoes a hit that landed on the overflow counter, not the key', () => {
      const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
      l.consume('a', 0);
      const hit = l.consume('b', 1);
      if (!hit.allowed) throw new Error('expected an allowed hit');
      expect(l.consume('c', 2)).toMatchObject({ allowed: false });
      l.release('b', hit.slot);
      expect(l.consume('c', 3)).toMatchObject({ allowed: true, slot: { where: 'overflow' } });
      // The tracked key 'a' was untouched by the release.
      expect(l.consume('a', 4)).toMatchObject({ allowed: false });
    });

    it('ignores a hit from a window that has already ended', () => {
      const l = createFixedWindowLimiter({ limit: 2, windowMs: 60_000 });
      const old = l.consume('k', 0);
      if (!old.allowed) throw new Error('expected an allowed hit');
      expect(l.consume('k', 60_000)).toMatchObject({ allowed: true });
      l.release('k', old.slot);
      // The new window still has its one hit; the stale release did not refund it.
      expect(l.consume('k', 60_001)).toMatchObject({ allowed: true });
      expect(l.consume('k', 60_002)).toMatchObject({ allowed: false });
    });

    it('does nothing for an unknown key', () => {
      const l = createFixedWindowLimiter({ limit: 1, windowMs: 60_000 });
      l.release('nope', { where: 'key', windowStart: 0 });
      expect(l.consume('nope', 1)).toMatchObject({ allowed: true });
    });
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

  describe('IPv6 client keys', () => {
    const ip = (value: string, header = 'x-forwarded-for') =>
      getClientIp(new Request('http://x', { headers: { [header]: value } }));

    it('buckets a full address by its /64 prefix', () => {
      expect(ip('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64');
      expect(ip('2001:0DB8:0001:0002:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2::/64');
      expect(ip('2001:db8:1:3:3:4:5:6')).toBe('2001:db8:1:3::/64');
    });

    it('gives every host in one /64 the same key', () => {
      const keys = new Set(
        ['2001:db8:1:2::1', '2001:db8:1:2::ffff', '2001:db8:1:2:a:b:c:d', '2001:DB8:1:2:0:0:0:9'].map(
          (v) => ip(v),
        ),
      );
      expect([...keys]).toEqual(['2001:db8:1:2::/64']);
    });

    it('expands compressed forms', () => {
      expect(ip('2001:db8::1')).toBe('2001:db8:0:0::/64');
      expect(ip('2001:db8:1:2::')).toBe('2001:db8:1:2::/64');
      expect(ip('2001:db8:1::5:6')).toBe('2001:db8:1:0::/64');
      expect(ip('::1')).toBe('0:0:0:0::/64');
      expect(ip('::')).toBe('0:0:0:0::/64');
      expect(ip('1::')).toBe('1:0:0:0::/64');
    });

    it('treats IPv4-mapped addresses as IPv4', () => {
      expect(ip('::ffff:1.2.3.4')).toBe('1.2.3.4');
      expect(ip('::FFFF:1.2.3.4')).toBe('1.2.3.4');
      expect(ip('0:0:0:0:0:ffff:102:304')).toBe('1.2.3.4');
      expect(ip('::ffff:102:304')).toBe('1.2.3.4');
    });

    it('ignores a zone id', () => {
      expect(ip('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
      expect(ip('fe80::2%en1')).toBe(ip('fe80::1%eth0'));
    });

    it('applies to x-real-ip and keeps the first x-forwarded-for entry', () => {
      expect(ip('2001:db8:1:2::9', 'x-real-ip')).toBe('2001:db8:1:2::/64');
      expect(ip('2001:db8:1:2::9, 1.1.1.1')).toBe('2001:db8:1:2::/64');
      expect(ip('1.1.1.1, 2001:db8:1:2::9')).toBe('1.1.1.1');
    });

    it('leaves IPv4, non-addresses and the unknown bucket unchanged', () => {
      expect(ip('203.0.113.7')).toBe('203.0.113.7');
      expect(ip('not-an-ip')).toBe('not-an-ip');
      expect(ip('2001:db8:1:2:3:4:5:6:7')).toBe('2001:db8:1:2:3:4:5:6:7');
      expect(getClientIp(new Request('http://x'))).toBe('unknown');
    });
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
