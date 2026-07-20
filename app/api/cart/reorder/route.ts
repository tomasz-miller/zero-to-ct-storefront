import { NextRequest, NextResponse } from 'next/server';

import {
  CartAccessError,
  CartNotFoundError,
  OutOfStockError,
} from '@/lib/commercetools/cart';
import {
  NothingToReorderError,
  reorderOrder,
  ReorderUnauthorizedError,
} from '@/lib/commercetools/cart-reorder';
import { CustomerOrderNotFoundError } from '@/lib/commercetools/customer-api';

export async function POST(request: NextRequest) {
  let body: { orderId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  try {
    const result = await reorderOrder(orderId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReorderUnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof CustomerOrderNotFoundError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (error instanceof NothingToReorderError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof OutOfStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    console.error('[api/cart/reorder]', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
