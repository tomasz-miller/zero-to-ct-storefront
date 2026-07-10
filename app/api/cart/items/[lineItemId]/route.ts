import { NextRequest, NextResponse } from 'next/server';

import {
  CartAccessError,
  CartNotFoundError,
  removeLineItem,
  updateLineItemQuantity,
} from '@/lib/commercetools/cart';

type RouteContext = {
  params: Promise<{ lineItemId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { lineItemId } = await context.params;

  let body: { quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const quantity = body.quantity;
  if (!Number.isFinite(quantity) || quantity! < 1) {
    return NextResponse.json(
      { error: 'quantity must be a positive number' },
      { status: 400 },
    );
  }

  try {
    const cart = await updateLineItemQuantity(lineItemId, quantity!);
    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    console.error('[api/cart/items PATCH]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { lineItemId } = await context.params;

  try {
    const cart = await removeLineItem(lineItemId);
    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    console.error('[api/cart/items DELETE]', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}
