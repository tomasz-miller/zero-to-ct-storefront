import { NextRequest, NextResponse } from 'next/server';

import { validateEmail, validatePassword } from '@/lib/auth-validation';
import { authErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { registerCustomer } from '@/lib/commercetools/customer-auth';

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  const password = body.password ?? '';
  const firstName = body.firstName?.trim() ?? '';
  const lastName = body.lastName?.trim() ?? '';

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
    return authErrorResponse(error);
  }
}
