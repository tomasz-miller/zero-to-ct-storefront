import { NextRequest, NextResponse } from 'next/server';

import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { loginCustomer } from '@/lib/commercetools/customer-auth';
import { CustomerError } from '@/lib/commercetools/domain-errors';
import {
  clearLoginFailures,
  limitAuthRequest,
  recordLoginFailure,
} from '@/lib/http/auth-rate-limits';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { LoginBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, LoginBodySchema);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;

  const limited = limitAuthRequest(request, 'login', email);
  if (limited) return limited;

  const emailError = validateEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const customer = await loginCustomer(email, password);
    clearLoginFailures(email);
    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof CustomerError && error.code === 'InvalidCredentials') {
      recordLoginFailure(email);
    }
    return toErrorResponse(error, 'api/auth/login');
  }
}
