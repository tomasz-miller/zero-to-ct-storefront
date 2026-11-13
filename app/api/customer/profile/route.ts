import { NextRequest, NextResponse } from 'next/server';

import { updateCustomerProfile } from '@/lib/commercetools/customer-profile';
import { validateProfileUpdate } from '@/lib/commercetools/customer-profile-validation';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { ProfileUpdateBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function PATCH(request: NextRequest) {
  const parsed = await parseJsonBody(request, ProfileUpdateBodySchema);
  if (!parsed.ok) return parsed.response;

  const validated = validateProfileUpdate(parsed.data);
  if (typeof validated === 'string') {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  try {
    const customer = await updateCustomerProfile(validated);
    return NextResponse.json({ customer });
  } catch (error) {
    return toErrorResponse(error, 'api/customer/profile');
  }
}
