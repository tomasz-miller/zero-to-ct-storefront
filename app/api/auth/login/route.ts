import { NextRequest, NextResponse } from 'next/server';

import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { loginCustomer } from '@/lib/commercetools/customer-auth';
import { CustomerError } from '@/lib/commercetools/domain-errors';
import { reserveLoginAttempt } from '@/lib/http/auth-rate-limits';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { LoginBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, LoginBodySchema);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;

  const emailError = validateEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  // Only well-formed requests create limiter keys: malformed or empty emails never do.
  // The failure caps are reserved before the credential check, so parallel requests cannot
  // all slip past a cap that is only updated afterwards.
  const reservation = reserveLoginAttempt(request, email);
  if (!reservation.ok) return reservation.response;
  const { attempt } = reservation;

  try {
    const customer = await loginCustomer(email, password);
    attempt.settle('succeeded');
    return NextResponse.json({ customer });
  } catch (error) {
    // Only rejected credentials keep the reserved slot; service errors are not guesses.
    attempt.settle(
      error instanceof CustomerError && error.code === 'InvalidCredentials' ? 'failed' : 'error',
    );
    return toErrorResponse(error, 'api/auth/login');
  }
}
