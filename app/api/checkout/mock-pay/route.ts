import { NextResponse } from 'next/server';

import { MockPaymentsDisabledError } from '@/lib/commercetools/domain-errors';
import {
  isMockPaymentsEnabled,
  placeMockPayment,
} from '@/lib/commercetools/mock-payment';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { MockPayBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: Request) {
  if (!isMockPaymentsEnabled()) {
    return toErrorResponse(new MockPaymentsDisabledError(), 'api/checkout/mock-pay');
  }

  const parsed = await parseJsonBody(request, MockPayBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await placeMockPayment({
      shippingMethodId: parsed.data.shippingMethodId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'api/checkout/mock-pay');
  }
}
