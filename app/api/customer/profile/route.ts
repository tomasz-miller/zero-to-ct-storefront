import { NextRequest, NextResponse } from 'next/server';

import { customerErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { updateCustomerProfile } from '@/lib/commercetools/customer-profile';
import { validateProfileUpdate } from '@/lib/commercetools/customer-profile-validation';

export async function PATCH(request: NextRequest) {
  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateProfileUpdate(body);
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const customer = await updateCustomerProfile(validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
