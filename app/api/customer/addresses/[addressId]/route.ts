import { NextRequest, NextResponse } from 'next/server';

import {
  removeCustomerAddress,
  updateCustomerAddress,
} from '@/lib/commercetools/customer-profile';
import { validateAddressInput } from '@/lib/commercetools/customer-profile-validation';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { AddressBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

type RouteContext = {
  params: Promise<{ addressId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { addressId } = await context.params;

  const parsed = await parseJsonBody(request, AddressBodySchema);
  if (!parsed.ok) return parsed.response;

  const validated = validateAddressInput(parsed.data, { requireAllFields: true });
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const customer = await updateCustomerAddress(addressId, validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/customer/addresses/[addressId] PATCH');
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { addressId } = await context.params;

  try {
    const customer = await removeCustomerAddress(addressId);
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/customer/addresses/[addressId] DELETE');
  }
}
