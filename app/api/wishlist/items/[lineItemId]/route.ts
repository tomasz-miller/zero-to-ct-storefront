import { NextResponse } from 'next/server';

import {
  removeWishlistItem,
  WishlistAccessError,
  WishlistLineItemNotFoundError,
  WishlistNotFoundError,
} from '@/lib/commercetools/shopping-lists';

type RouteContext = {
  params: Promise<{ lineItemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { lineItemId } = await context.params;

  if (!lineItemId) {
    return NextResponse.json({ error: 'lineItemId is required' }, { status: 400 });
  }

  try {
    const wishlist = await removeWishlistItem(lineItemId);
    return NextResponse.json({ wishlist });
  } catch (error) {
    if (error instanceof WishlistAccessError) {
      return NextResponse.json({ error: 'Wishlist access denied' }, { status: 403 });
    }
    if (error instanceof WishlistLineItemNotFoundError) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }
    if (error instanceof WishlistNotFoundError) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    console.error('[api/wishlist/items/[lineItemId]]', error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}
