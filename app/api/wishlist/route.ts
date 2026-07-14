import { NextResponse } from 'next/server';

import { getWishlist } from '@/lib/commercetools/shopping-lists';

export async function GET() {
  try {
    const wishlist = await getWishlist();
    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error('[api/wishlist]', error);
    return NextResponse.json({ error: 'Failed to load wishlist' }, { status: 500 });
  }
}
