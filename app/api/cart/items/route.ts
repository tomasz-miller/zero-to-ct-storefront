import { NextRequest, NextResponse } from 'next/server';

import {
  addLineItem,
  CartAccessError,
  CartNotFoundError,
  OutOfStockError,
} from '@/lib/commercetools/cart';

export async function POST(request: NextRequest) {
  let body: { sku?: string; quantity?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sku = body.sku?.trim();
  const quantity = body.quantity ?? 1;

  if (!sku) {
    return NextResponse.json({ error: 'sku is required' }, { status: 400 });
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json(
      { error: 'quantity must be a positive number' },
      { status: 400 },
    );
  }

  try {
    const cart = await addLineItem(sku, quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }
    if (error instanceof OutOfStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('[api/cart/items]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}
