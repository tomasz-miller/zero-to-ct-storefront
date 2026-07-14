import { NextRequest, NextResponse } from 'next/server';

import { customerErrorResponse } from '@/lib/commercetools/auth-route-utils';
import { addCustomerAddress } from '@/lib/commercetools/customer-profile';
import { validateAddressInput } from '@/lib/commercetools/customer-profile-validation';

export async function POST(request: NextRequest) {
  let body: {
    firstName?: string;
    lastName?: string;
    streetName?: string;
    streetNumber?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    isDefaultShipping?: boolean;
    isDefaultBilling?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateAddressInput(body, { requireAllFields: true });
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const customer = await addCustomerAddress(validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
