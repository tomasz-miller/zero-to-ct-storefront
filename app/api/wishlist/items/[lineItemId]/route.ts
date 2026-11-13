import { NextResponse } from 'next/server';

import { removeWishlistItem } from '@/lib/commercetools/shopping-lists';
import { toErrorResponse } from '@/lib/http/route-errors';

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
    return toErrorResponse(error, 'api/wishlist/items/[lineItemId]');
  }
}
