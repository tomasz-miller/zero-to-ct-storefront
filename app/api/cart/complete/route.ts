import { NextResponse } from 'next/server';

import { clearCartSession } from '@/lib/commercetools/cart-session';

export async function POST() {
  await clearCartSession();

  return NextResponse.json({ itemCount: 0 });
}
