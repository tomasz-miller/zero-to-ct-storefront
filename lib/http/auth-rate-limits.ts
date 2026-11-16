import 'server-only';

import type { NextResponse } from 'next/server';

import {
  createFixedWindowLimiter,
  getClientIp,
  tooManyRequestsResponse,
  type RateLimitResult,
} from './rate-limit';

export type AuthAction = 'login' | 'register' | 'forgot-password' | 'reset-password';

const MINUTE = 60_000;

/**
 * `ip`: client address only. `client-email`: client address plus email, so one client
 * cannot burn another client's budget for the same account. `email`: email only; a low
 * ceiling (5 reset requests / 60 min) that still stops attacks spread over many addresses.
 * Rotating addresses can burn it to deny a chosen customer for one window, which is the
 * accepted trade-off; one address alone cannot. The login email ceiling is not a rule here:
 * it counts failed sign-ins only (`loginEmailFailures`), so a flood of requests cannot lock
 * the account owner out.
 */
type Rule = { scope: 'ip' | 'client-email' | 'email'; limit: number; windowMs: number };

const RULES: Record<AuthAction, Rule[]> = {
  login: [
    { scope: 'ip', limit: 20, windowMs: 15 * MINUTE },
    { scope: 'client-email', limit: 10, windowMs: 15 * MINUTE },
  ],
  register: [{ scope: 'ip', limit: 5, windowMs: 60 * MINUTE }],
  'forgot-password': [
    { scope: 'ip', limit: 5, windowMs: 15 * MINUTE },
    { scope: 'client-email', limit: 3, windowMs: 60 * MINUTE },
    { scope: 'email', limit: 5, windowMs: 60 * MINUTE },
  ],
  'reset-password': [{ scope: 'ip', limit: 10, windowMs: 15 * MINUTE }],
};

// One limiter per rule: windows differ per action and scope, keys are `${action}:${scope}:${value}`.
const limiters = new Map<string, ReturnType<typeof createFixedWindowLimiter>>();
for (const [action, rules] of Object.entries(RULES)) {
  for (const rule of rules) {
    limiters.set(
      `${action}:${rule.scope}`,
      createFixedWindowLimiter({ limit: rule.limit, windowMs: rule.windowMs }),
    );
  }
}

/** Failed logins per client and email: 5 within 15 minutes lock further attempts from that client. */
const loginFailures = createFixedWindowLimiter({ limit: 5, windowMs: 15 * MINUTE });

/**
 * Failed sign-ins per email from any client: 30 within 15 minutes block further sign-in
 * attempts for that email. Only wrong credentials count (never every request), so an
 * attacker flooding an email cannot lock out the owner who types the right password, while
 * password guessing stays capped. A successful sign-in clears it: only someone who knows
 * the password can succeed, so clearing gives an attacker nothing and spares the owner.
 */
const loginEmailFailures = createFixedWindowLimiter({ limit: 30, windowMs: 15 * MINUTE });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Unambiguous composite key: neither an IPv6 address nor an email can collide across the pair. */
const clientEmailKey = (ip: string, normalizedEmail: string) =>
  JSON.stringify([ip, normalizedEmail]);

/**
 * Returns a 429 response when the request is over a limit, else null.
 * Call it only after the body and email are validated: every email passed here creates limiter keys.
 */
export function limitAuthRequest(
  request: Request,
  action: AuthAction,
  email?: string,
): NextResponse | null {
  const normalized = email === undefined ? undefined : normalizeEmail(email);
  const ip = getClientIp(request);

  if (action === 'login' && normalized !== undefined) {
    const locked = loginFailures.peek(clientEmailKey(ip, normalized));
    if (!locked.allowed) return tooManyRequestsResponse(locked.retryAfterSeconds);
    const emailLocked = loginEmailFailures.peek(normalized);
    if (!emailLocked.allowed) return tooManyRequestsResponse(emailLocked.retryAfterSeconds);
  }

  for (const rule of RULES[action]) {
    let value: string;
    if (rule.scope === 'ip') value = ip;
    else if (normalized === undefined) continue;
    else value = rule.scope === 'email' ? normalized : clientEmailKey(ip, normalized);
    const limiter = limiters.get(`${action}:${rule.scope}`);
    const result: RateLimitResult | undefined = limiter?.consume(`${action}:${rule.scope}:${value}`);
    if (result && !result.allowed) return tooManyRequestsResponse(result.retryAfterSeconds);
  }
  return null;
}

/** Call only when commercetools rejected the credentials. */
export function recordLoginFailure(request: Request, email: string): void {
  const normalized = normalizeEmail(email);
  loginFailures.consume(clientEmailKey(getClientIp(request), normalized));
  loginEmailFailures.consume(normalized);
}

export function clearLoginFailures(request: Request, email: string): void {
  const normalized = normalizeEmail(email);
  loginFailures.reset(clientEmailKey(getClientIp(request), normalized));
  loginEmailFailures.reset(normalized);
}

/** Test helper: forget all counters. */
export function resetAuthRateLimits(): void {
  for (const limiter of limiters.values()) limiter.clear();
  loginFailures.clear();
  loginEmailFailures.clear();
}
