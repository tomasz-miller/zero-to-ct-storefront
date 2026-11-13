import { NextResponse } from 'next/server';

import { MockPaymentsDisabledError } from '@/lib/commercetools/domain-errors';
import {
  isMockPaymentsEnabled,
  prepareMockCheckout,
} from '@/lib/commercetools/mock-payment';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { MockPrepareBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: Request) {
  if (!isMockPaymentsEnabled()) {
    return toErrorResponse(
      new MockPaymentsDisabledError(),
      'api/checkout/mock-prepare',
    );
  }

  const parsed = await parseJsonBody(request, MockPrepareBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await prepareMockCheckout(parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'api/checkout/mock-prepare');
  }
}
