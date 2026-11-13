import { NextResponse } from 'next/server';

import { getCartForCheckout } from '@/lib/commercetools/cart';
import { createCheckoutSession } from '@/lib/commercetools/checkout-session';
import { setLastOrderSession } from '@/lib/commercetools/last-order-session';
import { createOrderNumber } from '@/lib/commercetools/order-number';
import { getStorefrontContext } from '@/lib/commercetools/storefront-context';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST() {
  try {
    const [{ cart }, { country: marketCountry }] = await Promise.all([
      getCartForCheckout(),
      getStorefrontContext(),
    ]);
    const orderNumber = createOrderNumber();
    const sessionId = await createCheckoutSession(
      cart.id,
      cart.country ?? marketCountry,
      orderNumber,
    );
    await setLastOrderSession({ orderNumber, cartId: cart.id });

    return NextResponse.json({ sessionId });
  } catch (error) {
    return toErrorResponse(error, 'api/checkout/session');
  }
}
