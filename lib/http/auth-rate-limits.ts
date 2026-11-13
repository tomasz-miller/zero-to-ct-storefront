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

type Rule = { scope: 'ip' | 'email'; limit: number; windowMs: number };

const RULES: Record<AuthAction, Rule[]> = {
  login: [
    { scope: 'ip', limit: 20, windowMs: 15 * MINUTE },
    { scope: 'email', limit: 10, windowMs: 15 * MINUTE },
  ],
  register: [{ scope: 'ip', limit: 5, windowMs: 60 * MINUTE }],
  'forgot-password': [
    { scope: 'ip', limit: 5, windowMs: 15 * MINUTE },
    { scope: 'email', limit: 3, windowMs: 60 * MINUTE },
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

/** Failed logins per email: 5 within 15 minutes lock further attempts. */
const loginFailures = createFixedWindowLimiter({ limit: 5, windowMs: 15 * MINUTE });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Returns a 429 response when the request is over a limit, else null.
 * Call it right after the body has been parsed.
 */
export function limitAuthRequest(
  request: Request,
  action: AuthAction,
  email?: string,
): NextResponse | null {
  const normalized = email === undefined ? undefined : normalizeEmail(email);

  if (action === 'login' && normalized !== undefined) {
    const locked = loginFailures.peek(normalized);
    if (!locked.allowed) return tooManyRequestsResponse(locked.retryAfterSeconds);
  }

  const ip = getClientIp(request);
  for (const rule of RULES[action]) {
    const value = rule.scope === 'ip' ? ip : normalized;
    if (value === undefined) continue;
    const limiter = limiters.get(`${action}:${rule.scope}`);
    const result: RateLimitResult | undefined = limiter?.consume(`${action}:${rule.scope}:${value}`);
    if (result && !result.allowed) return tooManyRequestsResponse(result.retryAfterSeconds);
  }
  return null;
}

export function recordLoginFailure(email: string): void {
  loginFailures.consume(normalizeEmail(email));
}

export function clearLoginFailures(email: string): void {
  loginFailures.reset(normalizeEmail(email));
}

/** Test helper: forget all counters. */
export function resetAuthRateLimits(): void {
  for (const limiter of limiters.values()) limiter.clear();
  loginFailures.clear();
}
