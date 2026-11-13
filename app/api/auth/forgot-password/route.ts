import { NextRequest, NextResponse } from 'next/server';

import { validateEmail } from '@/lib/auth-validation';
import { authErrorResponse } from '@/lib/commercetools/auth-route-utils';
import {
  CustomerAuthError,
  requestPasswordReset,
} from '@/lib/commercetools/customer-auth';
import {
  isPasswordResetDeliveryConfigured,
  isPasswordResetDevLinkEnabled,
} from '@/lib/commercetools/password-reset-delivery';

const GENERIC_MESSAGE =
  'If an account exists for this email, you will receive password reset instructions shortly.';

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

  // No delivery path: do not mint a live token commercetools would hold for nobody.
  if (!isPasswordResetDeliveryConfigured()) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  try {
    const result = await requestPasswordReset(email);
    const response: { message: string; devResetUrl?: string } = {
      message: GENERIC_MESSAGE,
    };

    if (isPasswordResetDevLinkEnabled() && result.tokenValue) {
      response.devResetUrl = `/reset-password?token=${encodeURIComponent(result.tokenValue)}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      // Do not reveal whether the email exists.
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    return authErrorResponse(error);
  }
}
