import { NextResponse } from 'next/server';

import {
  applyMockShippingMethod,
  isMockPaymentsEnabled,
  mockCheckoutFailure,
} from '@/lib/commercetools/mock-payment';

export async function POST(request: Request) {
  if (!isMockPaymentsEnabled()) {
    return NextResponse.json(
      { error: 'Mock payments are disabled' },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const shippingMethodId =
    'shippingMethodId' in body && typeof body.shippingMethodId === 'string'
      ? body.shippingMethodId
      : '';

  try {
    const result = await applyMockShippingMethod(shippingMethodId);

    return NextResponse.json(result);
  } catch (error) {
    const failure = mockCheckoutFailure(error);
    if (failure) {
      return NextResponse.json(
        { error: failure.error },
        { status: failure.status },
      );
    }

    console.error('[api/checkout/mock-shipping]', error);
    return NextResponse.json(
      { error: 'Failed to update shipping method' },
      { status: 500 },
    );
  }
}
