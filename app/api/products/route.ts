import { NextRequest, NextResponse } from 'next/server';

import {
  getDefaultProductListingSort,
  parseProductListingSort,
} from '@/lib/commercetools/product-listing-params';
import { parseProductListingFilters } from '@/lib/commercetools/product-search-facets';
import { clampInteger } from '@/lib/http/query-params';
import { toErrorResponse } from '@/lib/http/route-errors';
import { getCatalogContext } from '@/lib/commercetools/storefront-context';
import { listProducts } from '@/lib/commercetools/products';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = clampInteger(searchParams.get('limit'), {
    min: 1,
    max: 100,
    fallback: 12,
  });
  const offset = clampInteger(searchParams.get('offset'), {
    min: 0,
    max: 10_000 - limit,
    fallback: 0,
  });
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
      limit,
      offset,
      locale,
      currency,
      query,
      sort,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'api/products');
  }
}
