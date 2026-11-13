import { NextRequest, NextResponse } from 'next/server';

import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { loginCustomer } from '@/lib/commercetools/customer-auth';
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

  try {
    const customer = await loginCustomer(email, password);
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/auth/login');
  }
}
