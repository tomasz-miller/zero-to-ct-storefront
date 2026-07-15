import { NextResponse } from 'next/server';

import { applyDefaultAddressesToCart } from '@/lib/commercetools/checkout-cart-addresses';
import {
  CartAccessError,
  CartNotFoundError,
  NoDefaultAddressError,
} from '@/lib/commercetools/cart';

export async function POST() {
  try {
    const cart = await applyDefaultAddressesToCart();

    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    if (error instanceof NoDefaultAddressError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[api/checkout/default-address]', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to apply default address';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
