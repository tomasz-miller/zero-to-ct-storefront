import { NextRequest, NextResponse } from 'next/server';

import { realignCartForStorefront } from '@/lib/commercetools/cart';
import { setMarketPreference } from '@/lib/commercetools/market-session';
import { getStorefrontContext } from '@/lib/commercetools/storefront-context';
import { parseJsonBody } from '@/lib/http/parse-json-body';
import { MarketBodySchema } from '@/lib/http/request-schemas';
import { toErrorResponse } from '@/lib/http/route-errors';

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, MarketBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    await setMarketPreference(parsed.data.country);
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
    return toErrorResponse(error, 'api/storefront/market');
  }
}
