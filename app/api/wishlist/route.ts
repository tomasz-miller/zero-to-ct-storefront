import { NextResponse } from 'next/server';

import { toErrorResponse } from '@/lib/http/route-errors';
import { getWishlist } from '@/lib/commercetools/shopping-lists';

export async function GET() {
  try {
    const wishlist = await getWishlist();
    return NextResponse.json({ wishlist });
  } catch (error) {
    return toErrorResponse(error, 'api/wishlist');
  }
}
