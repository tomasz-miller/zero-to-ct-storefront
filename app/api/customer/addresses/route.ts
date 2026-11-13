import { NextRequest, NextResponse } from 'next/server';

import { addCustomerAddress } from '@/lib/commercetools/customer-profile';
import { validateAddressInput } from '@/lib/commercetools/customer-profile-validation';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { AddressBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, AddressBodySchema);
  if (!parsed.ok) return parsed.response;

  const validated = validateAddressInput(parsed.data, { requireAllFields: true });
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const customer = await addCustomerAddress(validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/customer/addresses POST');
  }
}
