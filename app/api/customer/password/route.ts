import { NextRequest, NextResponse } from 'next/server';

import { customerErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { changeCustomerPassword } from '@/lib/commercetools/customer-profile';
import { validatePasswordChange } from '@/lib/commercetools/customer-profile-validation';

export async function POST(request: NextRequest) {
  let body: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validatePasswordChange(body);
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
    return customerErrorResponse(error);
  }
}
