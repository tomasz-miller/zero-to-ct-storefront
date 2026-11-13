import { NextRequest, NextResponse } from 'next/server';

import { changeCustomerPassword } from '@/lib/commercetools/customer-profile';
import { validatePasswordChange } from '@/lib/commercetools/customer-profile-validation';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { PasswordChangeBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, PasswordChangeBodySchema);
  if (!parsed.ok) return parsed.response;

  const validated = validatePasswordChange(parsed.data);
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    await changeCustomerPassword(
      validated.currentPassword,
      validated.newPassword,
    );
    return NextResponse.json({
      message: 'Password updated. Sign in again with your new password.',
      requiresSignIn: true,
    });
  } catch (error) {
    return toErrorResponse(error, 'api/customer/password');
  }
}
