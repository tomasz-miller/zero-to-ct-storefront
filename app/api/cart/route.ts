import { NextResponse } from 'next/server';

import { getGuestCart } from '@/lib/commercetools/cart';

export async function GET() {
  try {
    const cart = await getGuestCart();
    return NextResponse.json({ cart });
  } catch (error) {
    console.error('[api/cart]', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}
