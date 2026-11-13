import { NextResponse } from 'next/server';

import { getAuthenticatedCustomerProfile } from '@/lib/commercetools/customer-auth';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomerProfile();
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/auth/session');
  }
}
