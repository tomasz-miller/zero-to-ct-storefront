import { NextRequest, NextResponse } from 'next/server';

import { addWishlistItem } from '@/lib/commercetools/shopping-lists';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { WishlistItemBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, WishlistItemBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const wishlist = await addWishlistItem(parsed.data.sku);
    return NextResponse.json({ wishlist });
  } catch (error) {
    return toErrorResponse(error, 'api/wishlist/items');
  }
}
