/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shrinks only the per-email failure limiter (limit 30) to 3 keys so the test can fill it.
// Every other limiter keeps its real size.
vi.mock('./rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./rate-limit')>();
  return {
    ...actual,
    createFixedWindowLimiter: (options: Parameters<typeof actual.createFixedWindowLimiter>[0]) =>
      actual.createFixedWindowLimiter(options.limit === 30 ? { ...options, maxKeys: 3 } : options),
  };
});

import { reserveLoginAttempt, resetAuthRateLimits } from './auth-rate-limits';

const reqFrom = (ip: string) =>
  new Request('http://localhost/api/auth/x', { headers: { 'x-forwarded-for': ip } });

const fromIp = (i: number) => reqFrom(`10.0.${Math.floor(i / 250)}.${i % 250}`);

describe('auth-rate-limits with a full per-email limiter', () => {
  beforeEach(() => {
    resetAuthRateLimits();
    // Three other emails fill the map with live counters.
    for (let i = 0; i < 3; i++) {
      const reservation = reserveLoginAttempt(fromIp(900 + i), `filler-${i}@example.com`);
      if (!reservation.ok) throw new Error('filler refused');
      reservation.attempt.settle('failed');
    }
  });

  it('still caps an untracked email at 30 failures through the shared overflow', () => {
    for (let i = 0; i < 30; i++) {
      const reservation = reserveLoginAttempt(fromIp(i), 'victim@example.com');
      expect(reservation.ok).toBe(true);
      if (reservation.ok) reservation.attempt.settle('failed');
    }
    const blocked = reserveLoginAttempt(fromIp(100), 'victim@example.com');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.response.status).toBe(429);
  });

  it('gives overflow slots back on success and on errors', () => {
    for (let i = 0; i < 40; i++) {
      const reservation = reserveLoginAttempt(fromIp(i), 'victim@example.com');
      expect(reservation.ok).toBe(true);
      if (reservation.ok) reservation.attempt.settle(i % 2 ? 'succeeded' : 'error');
    }
  });
});
