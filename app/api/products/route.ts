import { NextRequest, NextResponse } from 'next/server';

import {
  getDefaultProductListingSort,
  parseProductListingSort,
} from '@/lib/commercetools/product-listing-params';
import { parseProductListingFilters } from '@/lib/commercetools/product-search-facets';
import { getCatalogContext } from '@/lib/commercetools/storefront-context';
import { listProducts } from '@/lib/commercetools/products';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Number(searchParams.get('limit') ?? '12');
  const offset = Number(searchParams.get('offset') ?? '0');
  const { locale: catalogLocale, currency: catalogCurrency } =
    await getCatalogContext();
  const locale = searchParams.get('locale') ?? catalogLocale;
  const currency = searchParams.get('currency') ?? catalogCurrency;
  const query = searchParams.get('q') ?? undefined;
  const listingMode = query ? 'search' : 'category';
  const defaultSort = getDefaultProductListingSort(listingMode);
  const sort = parseProductListingSort(
    searchParams.get('sort') ?? undefined,
    defaultSort,
    listingMode,
  );
  const filters = parseProductListingFilters(
    Object.fromEntries(searchParams.entries()),
  );

  try {
    const result = await listProducts({
      limit: Number.isFinite(limit) ? limit : 12,
      offset: Number.isFinite(offset) ? offset : 0,
      locale,
      currency,
      query,
      sort,
      filters,
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
