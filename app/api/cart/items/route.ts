import { NextRequest, NextResponse } from 'next/server';

import { addLineItem } from '@/lib/commercetools/cart';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { AddCartItemBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, AddCartItemBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const cart = await addLineItem(parsed.data.sku, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart/items');
  }
}
