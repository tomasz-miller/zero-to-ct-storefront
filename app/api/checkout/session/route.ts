import { NextResponse } from 'next/server';

import {
  CartAccessError,
  CartNotFoundError,
  getCartForCheckout,
} from '@/lib/commercetools/cart';
import { createGuestCheckoutSession } from '@/lib/commercetools/checkout-session';

export async function POST() {
  try {
    const { cart } = await getCartForCheckout();
    const sessionId = await createGuestCheckoutSession(
      cart.id,
      cart.country ?? 'DE',
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
