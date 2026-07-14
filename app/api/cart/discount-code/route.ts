import { NextRequest, NextResponse } from 'next/server';

import {
  addDiscountCode,
  CartAccessError,
  CartNotFoundError,
  removeDiscountCode,
} from '@/lib/commercetools/cart';
import {
  DiscountCodeNotApplicableError,
  discountCodeUserMessage,
  InvalidDiscountCodeError,
} from '@/lib/commercetools/cart-discount-errors';

export async function POST(request: NextRequest) {
  let body: { code?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  try {
    const cart = await addDiscountCode(code);
    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof InvalidDiscountCodeError ||
      error instanceof DiscountCodeNotApplicableError
    ) {
      return NextResponse.json({ error: discountCodeUserMessage(error) }, { status: 422 });
    }

    console.error('[api/cart/discount-code]', error);
    return NextResponse.json(
      { error: 'Failed to apply discount code' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  let body: { discountCodeId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const discountCodeId = body.discountCodeId?.trim();
  if (!discountCodeId) {
    return NextResponse.json(
      { error: 'discountCodeId is required' },
      { status: 400 },
    );
  }

  try {
    const cart = await removeDiscountCode(discountCodeId);
    return NextResponse.json({ cart });
  } catch (error) {
    if (error instanceof CartAccessError) {
      return NextResponse.json({ error: 'Cart access denied' }, { status: 403 });
    }
    if (error instanceof CartNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('[api/cart/discount-code]', error);
    return NextResponse.json(
      { error: 'Failed to remove discount code' },
      { status: 500 },
    );
  }
}
