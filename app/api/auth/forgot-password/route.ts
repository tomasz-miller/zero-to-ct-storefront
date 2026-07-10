import { NextRequest, NextResponse } from 'next/server';

import { validateEmail } from '@/lib/auth-validation';
import { authErrorResponse } from '@/lib/commercetools/auth-route-utils';
import {
  CustomerAuthError,
  requestPasswordReset,
} from '@/lib/commercetools/customer-auth';

export async function POST(request: NextRequest) {
  let body: { email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim() ?? '';
  const emailError = validateEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  try {
    const result = await requestPasswordReset(email);
    const response: { message: string; devResetUrl?: string } = {
      message:
        'If an account exists for this email, you will receive password reset instructions shortly.',
    };

    if (process.env.NODE_ENV !== 'production' && result.tokenValue) {
      response.devResetUrl = `/reset-password?token=${encodeURIComponent(result.tokenValue)}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      // Do not reveal whether the email exists.
      return NextResponse.json({
        message:
          'If an account exists for this email, you will receive password reset instructions shortly.',
      });
    }

    return authErrorResponse(error);
  }
}
