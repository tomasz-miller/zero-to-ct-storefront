/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLoginFailures,
  limitAuthRequest,
  recordLoginFailure,
  resetAuthRateLimits,
} from './auth-rate-limits';

const reqFrom = (ip: string) =>
  new Request('http://localhost/api/auth/x', { headers: { 'x-forwarded-for': ip } });

const req = () => reqFrom('9.9.9.9');

describe('auth-rate-limits', () => {
  beforeEach(() => resetAuthRateLimits());

  it('locks an email for one client after 5 failed logins', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(req(), 'Jane@Example.com ');
    expect(limitAuthRequest(req(), 'login', 'jane@example.com')?.status).toBe(429);
  });

  it('does not lock the victim out for other clients after failures from one ip', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(reqFrom('1.1.1.1'), 'victim@example.com');
    expect(limitAuthRequest(reqFrom('1.1.1.1'), 'login', 'victim@example.com')?.status).toBe(429);
    expect(limitAuthRequest(reqFrom('2.2.2.2'), 'login', 'victim@example.com')).toBeNull();
  });

  it('does not exhaust the victim login attempt budget for other clients', () => {
    for (let i = 0; i < 10; i++) {
      expect(limitAuthRequest(reqFrom('1.1.1.1'), 'login', 'victim@example.com')).toBeNull();
    }
    expect(limitAuthRequest(reqFrom('1.1.1.1'), 'login', 'victim@example.com')?.status).toBe(429);
    expect(limitAuthRequest(reqFrom('2.2.2.2'), 'login', 'victim@example.com')).toBeNull();
  });

  it('still trips a loose per-email login ceiling across many clients', () => {
    for (let i = 0; i < 100; i++) {
      expect(
        limitAuthRequest(reqFrom(`10.0.${Math.floor(i / 250)}.${i % 250}`), 'login', 'victim@example.com'),
      ).toBeNull();
    }
    expect(limitAuthRequest(reqFrom('10.9.9.9'), 'login', 'victim@example.com')?.status).toBe(429);
    expect(limitAuthRequest(reqFrom('10.9.9.9'), 'login', 'other@example.com')).toBeNull();
  });

  it('clears the failure counter of the same client and email on success', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(req(), 'jane@example.com');
    clearLoginFailures(req(), 'Jane@Example.com');
    expect(limitAuthRequest(req(), 'login', 'jane@example.com')).toBeNull();
  });

  it('does not let a success from one client clear the failures of another', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(reqFrom('1.1.1.1'), 'jane@example.com');
    clearLoginFailures(reqFrom('2.2.2.2'), 'jane@example.com');
    expect(limitAuthRequest(reqFrom('1.1.1.1'), 'login', 'jane@example.com')?.status).toBe(429);
  });

  it('limits forgot-password to 3 per email per client per hour', () => {
    for (let i = 0; i < 3; i++) {
      expect(limitAuthRequest(req(), 'forgot-password', 'victim@example.com')).toBeNull();
    }
    expect(limitAuthRequest(req(), 'forgot-password', 'victim@example.com')?.status).toBe(429);
    expect(limitAuthRequest(reqFrom('2.2.2.2'), 'forgot-password', 'victim@example.com')).toBeNull();
  });

  it('still trips a loose per-email forgot-password ceiling across many clients', () => {
    for (let i = 0; i < 20; i++) {
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
