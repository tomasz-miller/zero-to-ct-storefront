import { NextRequest, NextResponse } from 'next/server';

import { validatePassword } from '@/lib/auth-validation';
import { resetCustomerPassword } from '@/lib/commercetools/customer-auth';
import { limitAuthRequest } from '@/lib/http/auth-rate-limits';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { ResetPasswordBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, ResetPasswordBodySchema);
  if (!parsed.ok) return parsed.response;

  const { token, newPassword } = parsed.data;

  const limited = limitAuthRequest(request, 'reset-password');
  if (limited) return limited;

  if (!token) {
    return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    await resetCustomerPassword(token, newPassword);
    return NextResponse.json({
      message: 'Password updated. You can sign in with your new password.',
    });
  } catch (error) {
    return toErrorResponse(error, 'api/auth/reset-password');
  }
}
