import 'server-only';

import type { NextResponse } from 'next/server';

import {
  createFixedWindowLimiter,
  getClientIp,
  tooManyRequestsResponse,
  type ConsumeResult,
  type LimiterSlot,
} from './rate-limit';

export type AuthAction = 'login' | 'register' | 'forgot-password' | 'reset-password';

const MINUTE = 60_000;

/**
 * `ip`: client address only. `client-email`: client address plus email, so one client
 * cannot burn another client's budget for the same account. `email`: email only; a low
 * ceiling (5 reset requests / 60 min) that still stops attacks spread over many addresses.
 * Rotating addresses can burn it to deny a chosen customer for one window, which is the
 * accepted trade-off; one address alone cannot. The login email ceiling is not a rule here:
 * it counts failed sign-ins only (`loginEmailFailures`), so the owner's own successful sign-ins
 * and service errors never spend it. It does not keep an attacker from locking the owner out:
 * wrong passwords count as failures.
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

/**
 * Failed logins per client and email: 5 within 15 minutes lock further attempts from that
 * client. A slot is reserved before the credential check (see `reserveLoginAttempt`).
 */
const loginFailures = createFixedWindowLimiter({ limit: 5, windowMs: 15 * MINUTE });

/**
 * Failed sign-ins per email from any client: 30 within 15 minutes block further sign-in
 * attempts for that email, which limits password guessing to 30 per email per window per
 * instance. A slot is reserved before the credential check and kept only when commercetools
 * rejects the credentials, so concurrent requests cannot exceed the cap and a full limiter
 * still caps through its shared overflow counter. The owner's successful sign-ins and service
 * errors give their slot back and a success never clears failures already recorded.
 * It does not stop an attacker from locking the owner out: wrong passwords count as failures,
 * so 30 failures per window (from at least 6 clients, each locked out after 5 by
 * `loginFailures`) hold the email at the cap. Separating the owner from an attacker would need
 * a known-device mechanism, which is not implemented.
 */
const loginEmailFailures = createFixedWindowLimiter({ limit: 30, windowMs: 15 * MINUTE });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Unambiguous composite key: neither an IPv6 address nor an email can collide across the pair. */
const clientEmailKey = (ip: string, normalizedEmail: string) =>
  JSON.stringify([ip, normalizedEmail]);

/** Consumes the request-count rules of `action` (ip, client-email, email); 429 when over one. */
function consumeRules(
  action: AuthAction,
  ip: string,
  normalized: string | undefined,
): NextResponse | null {
  for (const rule of RULES[action]) {
    let value: string;
    if (rule.scope === 'ip') value = ip;
    else if (normalized === undefined) continue;
    else value = rule.scope === 'email' ? normalized : clientEmailKey(ip, normalized);
    const result = limiters.get(`${action}:${rule.scope}`)?.consume(`${action}:${rule.scope}:${value}`);
    if (result && !result.allowed) return tooManyRequestsResponse(result.retryAfterSeconds);
  }
  return null;
}

/**
 * Returns a 429 response when the request is over a limit, else null. Not for `login`, which
 * has failure caps and goes through `reserveLoginAttempt`.
 * Call it only after the body and email are validated: every email passed here creates limiter keys.
 */
export function limitAuthRequest(
  request: Request,
  action: Exclude<AuthAction, 'login'>,
  email?: string,
): NextResponse | null {
  return consumeRules(
    action,
    getClientIp(request),
    email === undefined ? undefined : normalizeEmail(email),
  );
}

export type LoginOutcome =
  /** commercetools rejected the credentials: the reserved failure slots stay spent. */
  | 'failed'
  /** The client signed in: its slots are released and its own ip+email failure counter cleared. */
  | 'succeeded'
  /** Any other error (5xx, network, unexpected): the reserved failure slots are released. */
  | 'error';

export type LoginAttempt = {
  /** Resolves the reservation; only the first call has an effect. */
  settle(outcome: LoginOutcome): void;
};

export type LoginReservation =
  | { ok: true; attempt: LoginAttempt }
  | { ok: false; response: NextResponse };

/**
 * Starts a sign-in attempt: reserves one slot on each failure cap (per client and email 5, per
 * email 30 per 15 min) and applies the request-count rules, all BEFORE the credential check.
 * Reserving up front is what makes the caps hard: parallel requests cannot all pass a check
 * that only later records a failure, and an email with no counter of its own (limiter full)
 * is still capped through the overflow counter. Call `attempt.settle(...)` exactly once after
 * the credential check. Call it only after the body and email are validated: every email
 * passed here creates limiter keys.
 */
export function reserveLoginAttempt(request: Request, email: string): LoginReservation {
  const normalized = normalizeEmail(email);
  const ip = getClientIp(request);
  const pairKey = clientEmailKey(ip, normalized);

  const reservations: Array<{ limiter: typeof loginFailures; key: string; slot: LimiterSlot }> = [];
  const giveBack = () => {
    for (const { limiter, key, slot } of reservations) limiter.release(key, slot);
  };

  for (const [limiter, key] of [
    [loginFailures, pairKey],
    [loginEmailFailures, normalized],
  ] as const) {
    const result: ConsumeResult = limiter.consume(key);
    if (!result.allowed) {
      giveBack();
      return { ok: false, response: tooManyRequestsResponse(result.retryAfterSeconds) };
    }
    reservations.push({ limiter, key, slot: result.slot });
  }

  const limited = consumeRules('login', ip, normalized);
  if (limited) {
    giveBack();
    return { ok: false, response: limited };
  }

  let settled = false;
  return {
    ok: true,
    attempt: {
      settle(outcome) {
        if (settled) return;
        settled = true;
        if (outcome === 'failed') return;
        giveBack();
        // Only this client's own ip+email counter is cleared. The account-wide counter is not:
        // clearing it on success would refund an attacker's guesses whenever the owner signs in.
        if (outcome === 'succeeded') loginFailures.reset(pairKey);
      },
    },
  };
}

/** Test helper: forget all counters. */
export function resetAuthRateLimits(): void {
  for (const limiter of limiters.values()) limiter.clear();
  loginFailures.clear();
  loginEmailFailures.clear();
}
