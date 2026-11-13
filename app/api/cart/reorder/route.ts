import { NextRequest, NextResponse } from 'next/server';

import { reorderOrder } from '@/lib/commercetools/cart-reorder';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { ReorderBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, ReorderBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await reorderOrder(parsed.data.orderId);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'api/cart/reorder');
  }
}
