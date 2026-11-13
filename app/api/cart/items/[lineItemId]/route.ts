import { NextRequest, NextResponse } from 'next/server';

import { removeLineItem, updateLineItemQuantity } from '@/lib/commercetools/cart';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { UpdateLineItemBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

type RouteContext = {
  params: Promise<{ lineItemId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { lineItemId } = await context.params;

  const parsed = await parseJsonBody(request, UpdateLineItemBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const cart = await updateLineItemQuantity(lineItemId, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart/items/[lineItemId] PATCH');
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { lineItemId } = await context.params;

  try {
    const cart = await removeLineItem(lineItemId);
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart/items/[lineItemId] DELETE');
  }
}
