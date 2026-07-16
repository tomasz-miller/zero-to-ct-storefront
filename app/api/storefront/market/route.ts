import { NextRequest, NextResponse } from 'next/server';

import { realignCartForStorefront } from '@/lib/commercetools/cart';
import { setMarketPreference } from '@/lib/commercetools/market-session';
import {
  getStorefrontContext,
  type StorefrontCountry,
} from '@/lib/commercetools/storefront-context';

function isStorefrontCountry(value: unknown): value is StorefrontCountry {
  return value === 'DE' || value === 'GB' || value === 'US';
}

export async function POST(request: NextRequest) {
  let body: { country?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isStorefrontCountry(body.country)) {
    return NextResponse.json(
      { error: 'country must be one of DE, GB, or US' },
      { status: 400 },
    );
  }

  try {
    await setMarketPreference(body.country);
    const [
      { cartRecreated, cartRestored, itemCount, previousHadItems },
      context,
    ] = await Promise.all([
      realignCartForStorefront(),
      getStorefrontContext(),
    ]);

    return NextResponse.json({
      country: context.country,
      currency: context.currency,
      locale: context.locale,
      cartRecreated,
      cartRestored,
      itemCount,
      previousHadItems,
    });
  } catch (error) {
    console.error('[api/storefront/market]', error);
    return NextResponse.json(
      { error: 'Failed to change storefront market' },
      { status: 500 },
    );
  }
}
