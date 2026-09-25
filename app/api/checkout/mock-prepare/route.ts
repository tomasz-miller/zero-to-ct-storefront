import { NextResponse } from 'next/server';

import { isMockPaymentsEnabled, mockCheckoutFailure, prepareMockCheckout } from '@/lib/commercetools/mock-payment';

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

  try {
    const result = await prepareMockCheckout(body);

    return NextResponse.json(result);
  } catch (error) {
    const failure = mockCheckoutFailure(error);
    if (failure) {
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    console.error('[api/checkout/mock-prepare]', error);
    return NextResponse.json(
      { error: 'Failed to prepare checkout' },
      { status: 500 },
    );
  }
}
