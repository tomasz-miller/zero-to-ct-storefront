import { NextResponse } from 'next/server';

import { moveWishlistItemToCart } from '@/lib/commercetools/shopping-lists';
import { toErrorResponse } from '@/lib/http/route-errors';

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
    return toErrorResponse(error, 'api/wishlist/items/[lineItemId]/move-to-cart');
  }
}
