/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  limitAuthRequest,
  recordLoginFailure,
  resetAuthRateLimits,
} from './auth-rate-limits';

const req = () =>
  new Request('http://localhost/api/auth/x', { headers: { 'x-forwarded-for': '9.9.9.9' } });

describe('auth-rate-limits', () => {
  beforeEach(() => resetAuthRateLimits());

  it('locks an email after 5 failed logins', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('Jane@Example.com ');
    expect(limitAuthRequest(req(), 'login', 'jane@example.com')?.status).toBe(429);
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
