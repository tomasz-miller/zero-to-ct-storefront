import { NextRequest, NextResponse } from 'next/server';

import {
  addWishlistItem,
  WishlistAccessError,
  WishlistNotFoundError,
} from '@/lib/commercetools/shopping-lists';

export async function POST(request: NextRequest) {
  let body: { sku?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sku = body.sku?.trim();
  if (!sku) {
    return NextResponse.json({ error: 'sku is required' }, { status: 400 });
  }

  try {
    const wishlist = await addWishlistItem(sku);
    return NextResponse.json({ wishlist });
  } catch (error) {
    if (error instanceof WishlistAccessError) {
      return NextResponse.json({ error: 'Wishlist access denied' }, { status: 403 });
    }
    if (error instanceof WishlistNotFoundError) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    console.error('[api/wishlist/items]', error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}
