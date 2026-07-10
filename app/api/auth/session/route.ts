import { NextResponse } from 'next/server';

import { authErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { getAuthenticatedCustomerProfile } from '@/lib/commercetools/customer-auth';

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomerProfile();
    return NextResponse.json({ customer });
  } catch (error) {
    return authErrorResponse(error);
  }
}
