/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  limitAuthRequest,
  reserveLoginAttempt,
  resetAuthRateLimits,
  type LoginAttempt,
} from './auth-rate-limits';

const reqFrom = (ip: string) =>
  new Request('http://localhost/api/auth/x', { headers: { 'x-forwarded-for': ip } });

const req = () => reqFrom('9.9.9.9');

const variedIp = (i: number) => reqFrom(`10.0.${Math.floor(i / 250)}.${i % 250}`);

/** Reserves a login slot and fails the test when it is refused. */
function reserved(request: Request, email: string): LoginAttempt {
  const reservation = reserveLoginAttempt(request, email);
  if (!reservation.ok) throw new Error(`expected a reservation, got ${reservation.response.status}`);
  return reservation.attempt;
}

const refusedStatus = (request: Request, email: string) => {
  const reservation = reserveLoginAttempt(request, email);
  if (reservation.ok) {
    reservation.attempt.settle('error');
    return null;
  }
  return reservation.response.status;
};

describe('auth-rate-limits', () => {
  beforeEach(() => resetAuthRateLimits());

  it('locks an email for one client after 5 failed logins', () => {
    for (let i = 0; i < 5; i++) reserved(req(), i % 2 ? 'jane@example.com' : 'Jane@Example.com ').settle('failed');
    expect(refusedStatus(req(), 'jane@example.com')).toBe(429);
  });

  it('does not lock the victim out for other clients after failures from one ip', () => {
    for (let i = 0; i < 5; i++) reserved(reqFrom('1.1.1.1'), 'victim@example.com').settle('failed');
    expect(refusedStatus(reqFrom('1.1.1.1'), 'victim@example.com')).toBe(429);
    expect(refusedStatus(reqFrom('2.2.2.2'), 'victim@example.com')).toBeNull();
  });

  it('does not exhaust the victim login attempt budget for other clients', () => {
    for (let i = 0; i < 10; i++) reserved(reqFrom('1.1.1.1'), 'victim@example.com').settle('error');
    expect(refusedStatus(reqFrom('1.1.1.1'), 'victim@example.com')).toBe(429);
    expect(refusedStatus(reqFrom('2.2.2.2'), 'victim@example.com')).toBeNull();
  });

  it('reserves a slot before the credential check, so concurrent attempts cannot exceed 30', () => {
    // None of the attempts is settled: they are all still waiting on commercetools.
    let allowed = 0;
    for (let i = 0; i < 40; i++) {
      if (reserveLoginAttempt(variedIp(i), 'victim@example.com').ok) allowed++;
    }
    expect(allowed).toBe(30);
  });

  it('caps password guessing at 30 failures per email across many clients', () => {
    for (let i = 0; i < 30; i++) reserved(variedIp(i), 'victim@example.com').settle('failed');
    expect(refusedStatus(reqFrom('10.9.9.9'), 'victim@example.com')).toBe(429);
    expect(refusedStatus(reqFrom('10.9.9.9'), 'other@example.com')).toBeNull();
  });

  it('gives the slot back on success and on non-credential errors', () => {
    for (let i = 0; i < 29; i++) reserved(variedIp(i), 'owner@example.com').settle('failed');
    for (let i = 0; i < 20; i++) reserved(variedIp(200 + i), 'owner@example.com').settle('error');
    // Only the 29 failures are on record: the 30th still goes through, the 31st does not.
    reserved(variedIp(300), 'owner@example.com').settle('failed');
    expect(refusedStatus(variedIp(301), 'owner@example.com')).toBe(429);
    resetAuthRateLimits();
    for (let i = 0; i < 40; i++) reserved(variedIp(i), 'owner@example.com').settle('succeeded');
  });

  it('settles an attempt only once', () => {
    for (let i = 0; i < 29; i++) reserved(variedIp(i), 'owner@example.com').settle('failed');
    const attempt = reserved(variedIp(100), 'owner@example.com');
    attempt.settle('failed');
    attempt.settle('error');
    expect(refusedStatus(variedIp(101), 'owner@example.com')).toBe(429);
  });

  it('clears the failure counter of the succeeding client and email', () => {
    for (let i = 0; i < 4; i++) reserved(req(), 'jane@example.com').settle('failed');
    reserved(req(), 'Jane@Example.com').settle('succeeded');
    // Back to a clean 5-failure budget for this client (4 failed + 1 success + 5 = 10 requests).
    for (let i = 0; i < 5; i++) reserved(req(), 'jane@example.com').settle('failed');
    expect(refusedStatus(req(), 'jane@example.com')).toBe(429);
  });

  it('does not let a success from one client clear the failures of another', () => {
    for (let i = 0; i < 5; i++) reserved(reqFrom('1.1.1.1'), 'jane@example.com').settle('failed');
    reserved(reqFrom('2.2.2.2'), 'jane@example.com').settle('succeeded');
    expect(refusedStatus(reqFrom('1.1.1.1'), 'jane@example.com')).toBe(429);
  });

  it('gives the reserved slots back when a request rule refuses the attempt', () => {
    // The 11th attempt from one client is refused by the client-email rule after both slots
    // were reserved; they must not stay spent.
    for (let i = 0; i < 10; i++) reserved(req(), 'victim@example.com').settle('error');
    expect(refusedStatus(req(), 'victim@example.com')).toBe(429);
    for (let i = 0; i < 30; i++) reserved(variedIp(i), 'victim@example.com').settle('failed');
    expect(refusedStatus(variedIp(100), 'victim@example.com')).toBe(429);
  });

  it('limits forgot-password to 3 per email per client per hour', () => {
    for (let i = 0; i < 3; i++) {
      expect(limitAuthRequest(req(), 'forgot-password', 'victim@example.com')).toBeNull();
    }
    expect(limitAuthRequest(req(), 'forgot-password', 'victim@example.com')?.status).toBe(429);
    expect(limitAuthRequest(reqFrom('2.2.2.2'), 'forgot-password', 'victim@example.com')).toBeNull();
  });

  it('still trips a loose per-email forgot-password ceiling across many clients', () => {
    for (let i = 0; i < 5; i++) {
      expect(
        limitAuthRequest(reqFrom(`10.0.0.${i + 1}`), 'forgot-password', 'victim@example.com'),
      ).toBeNull();
    }
    expect(
      limitAuthRequest(reqFrom('10.9.9.9'), 'forgot-password', 'victim@example.com')?.status,
    ).toBe(429);
  });

  it('limits register to 5 per IP per hour', () => {
    for (let i = 0; i < 5; i++) expect(limitAuthRequest(req(), 'register')).toBeNull();
    expect(limitAuthRequest(req(), 'register')?.status).toBe(429);
  });

  it('opens the register window again after an hour', () => {
    vi.useFakeTimers({ now: 0 });
    for (let i = 0; i < 6; i++) limitAuthRequest(req(), 'register');
    vi.setSystemTime(60 * 60 * 1000 + 1);
    expect(limitAuthRequest(req(), 'register')).toBeNull();
    vi.useRealTimers();
  });
});
