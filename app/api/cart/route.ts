import { NextResponse } from 'next/server';

import { getGuestCart } from '@/lib/commercetools/cart';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function GET() {
  try {
    const cart = await getGuestCart();
    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/cart');
  }
}
