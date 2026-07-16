import { NextResponse } from 'next/server';

import {
  CartAccessError,
  CartNotFoundError,
  getCartForCheckout,
} from '@/lib/commercetools/cart';
import { createCheckoutSession } from '@/lib/commercetools/checkout-session';
import { getStorefrontContext } from '@/lib/commercetools/storefront-context';

export async function POST() {
  try {
    const [{ cart }, { country: marketCountry }] = await Promise.all([
      getCartForCheckout(),
      getStorefrontContext(),
    ]);
    const sessionId = await createCheckoutSession(
      cart.id,
      cart.country ?? marketCountry,
    );

    return NextResponse.json({ sessionId });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[api/checkout/session]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
