import { NextRequest, NextResponse } from 'next/server';

import { customerErrorResponse } from '@/lib/commercetools/auth-route-utils';
import {
  removeCustomerAddress,
  updateCustomerAddress,
} from '@/lib/commercetools/customer-profile';
import { validateAddressInput } from '@/lib/commercetools/customer-profile-validation';

type RouteContext = {
  params: Promise<{ addressId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { addressId } = await context.params;

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
    const customer = await updateCustomerAddress(addressId, validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return customerErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { addressId } = await context.params;

  try {
    const customer = await removeCustomerAddress(addressId);
    return NextResponse.json({ customer });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
