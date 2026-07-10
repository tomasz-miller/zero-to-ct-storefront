import { NextRequest, NextResponse } from 'next/server';

import { getCatalogContext } from '@/lib/commercetools/storefront-context';
import { listProducts } from '@/lib/commercetools/products';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Number(searchParams.get('limit') ?? '12');
  const offset = Number(searchParams.get('offset') ?? '0');
  const { locale: catalogLocale, currency: catalogCurrency } =
    getCatalogContext();
  const locale = searchParams.get('locale') ?? catalogLocale;
  const currency = searchParams.get('currency') ?? catalogCurrency;
  const query = searchParams.get('q') ?? undefined;

  try {
    const result = await listProducts({
      limit: Number.isFinite(limit) ? limit : 12,
      offset: Number.isFinite(offset) ? offset : 0,
      locale,
      currency,
      query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/products]', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    );
  }
}
