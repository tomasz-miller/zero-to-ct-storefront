import { NextResponse } from 'next/server';

import { CartNotFoundError } from '@/lib/commercetools/cart';
import {
  moveWishlistItemToCart,
  WishlistAccessError,
  WishlistLineItemNotFoundError,
  WishlistNotFoundError,
} from '@/lib/commercetools/shopping-lists';

type RouteContext = {
  params: Promise<{ lineItemId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { lineItemId } = await context.params;

  if (!lineItemId) {
    return NextResponse.json({ error: 'lineItemId is required' }, { status: 400 });
  }

  try {
    const result = await moveWishlistItemToCart(lineItemId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WishlistAccessError) {
      return NextResponse.json({ error: 'Wishlist access denied' }, { status: 403 });
    }
    if (error instanceof WishlistLineItemNotFoundError) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }
    if (error instanceof WishlistNotFoundError || error instanceof CartNotFoundError) {
      return NextResponse.json({ error: 'Wishlist or cart not found' }, { status: 404 });
    }

    console.error('[api/wishlist/items/[lineItemId]/move-to-cart]', error);
    return NextResponse.json({ error: 'Failed to move item to cart' }, { status: 500 });
  }
}
