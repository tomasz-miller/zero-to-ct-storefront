import { NextRequest, NextResponse } from 'next/server';

import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { registerCustomer } from '@/lib/commercetools/customer-auth';
import { limitAuthRequest } from '@/lib/http/auth-rate-limits';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { RegisterBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, RegisterBodySchema);
  if (!parsed.ok) return parsed.response;

  const { email, password, firstName, lastName } = parsed.data;

  const limited = limitAuthRequest(request, 'register');
  if (limited) return limited;

  const emailError = validateEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (!firstName) {
    return NextResponse.json({ error: 'First name is required' }, { status: 400 });
  }

  if (!lastName) {
    return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
  }

  try {
    const customer = await registerCustomer({
      email,
      password,
      firstName,
      lastName,
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/auth/register');
  }
}
