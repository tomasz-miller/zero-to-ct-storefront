import { NextResponse } from 'next/server';

import { applyDefaultAddressesToCart } from '@/lib/commercetools/checkout-cart-addresses';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST() {
  try {
    const cart = await applyDefaultAddressesToCart();

    return NextResponse.json({ cart });
  } catch (error) {
    return toErrorResponse(error, 'api/checkout/default-address');
  }
}
