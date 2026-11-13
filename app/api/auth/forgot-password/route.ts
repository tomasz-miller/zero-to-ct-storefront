import { NextRequest, NextResponse } from 'next/server';

import { validateEmail } from '@/lib/auth-validation';
import { requestPasswordReset } from '@/lib/commercetools/customer-auth';
import {
  isPasswordResetDeliveryConfigured,
  isPasswordResetDevLinkEnabled,
} from '@/lib/commercetools/password-reset-delivery';
import { limitAuthRequest } from '@/lib/http/auth-rate-limits';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { ForgotPasswordBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

const GENERIC_MESSAGE =
  'If an account exists for this email, you will receive password reset instructions shortly.';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, ForgotPasswordBodySchema);
  if (!parsed.ok) return parsed.response;

  const { email } = parsed.data;

  const limited = limitAuthRequest(request, 'forgot-password', email);
  if (limited) return limited;

  const emailError = validateEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  // No delivery path: do not mint a live token commercetools would hold for nobody.
  if (!isPasswordResetDeliveryConfigured()) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  try {
    // An unknown email resolves to `{}` (see requestPasswordReset): same answer as a known one.
    const result = await requestPasswordReset(email);
    const response: { message: string; devResetUrl?: string } = {
      message: GENERIC_MESSAGE,
    };

    if (isPasswordResetDevLinkEnabled() && result.tokenValue) {
      response.devResetUrl = `/reset-password?token=${encodeURIComponent(result.tokenValue)}`;
    }

    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error, 'api/auth/forgot-password');
  }
}
