import { NextRequest, NextResponse } from 'next/server';

import { validatePassword } from '@/lib/auth-validation';
import { authErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { resetCustomerPassword } from '@/lib/commercetools/customer-auth';

export async function POST(request: NextRequest) {
  let body: { token?: string; newPassword?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = body.token?.trim() ?? '';
  const newPassword = body.newPassword ?? '';

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
    return authErrorResponse(error);
  }
}
