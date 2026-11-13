import { NextRequest, NextResponse } from 'next/server';

import { addDiscountCode, removeDiscountCode } from '@/lib/commercetools/cart';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import {
  DiscountCodeBodySchema,
  RemoveDiscountCodeBodySchema,
} from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, DiscountCodeBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const cart = await addDiscountCode(parsed.data.code);
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart/discount-code POST');
  }
}

export async function DELETE(request: NextRequest) {
  const parsed = await parseJsonBody(request, RemoveDiscountCodeBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const cart = await removeDiscountCode(parsed.data.discountCodeId);
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart/discount-code DELETE');
  }
}
