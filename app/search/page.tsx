import { redirect } from 'next/navigation';

import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { ProductListingControls } from '@/components/product/product-listing-controls';
import { ProductListingFacets } from '@/components/product/product-listing-facets';
import { SearchForm } from '@/components/search/search-form';
import {
  buildProductListingHref,
  clampProductListingPage,
  getDefaultProductListingSort,
  parseProductListingPage,
  parseProductListingSort,
  PRODUCT_LISTING_PAGE_SIZE,
  productListingOffset,
} from '@/lib/commercetools/product-listing-params';
import {
  EMPTY_PRODUCT_LISTING_FILTERS,
  parseProductListingFilters,
  productListingFiltersEqual,
} from '@/lib/commercetools/product-search-facets';
import { listProducts } from '@/lib/commercetools/products';

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q?.toString().trim() ?? '';
  const hasQuery = query.length > 0;
  const defaultSort = getDefaultProductListingSort('search');
  const sort = parseProductListingSort(
    resolvedSearchParams.sort?.toString(),
    defaultSort,
    'search',
  );
  const parsedFilters = parseProductListingFilters(resolvedSearchParams);
  const pageSize = PRODUCT_LISTING_PAGE_SIZE;
  const requestedPage = parseProductListingPage(
    resolvedSearchParams.page?.toString(),
    pageSize,
  );

  const listingResult = hasQuery
    ? await listProducts({
        query,
        limit: pageSize,
        offset: productListingOffset(requestedPage, pageSize),
        sort,
        filters: parsedFilters,
      })
    : {
        products: [],
        total: 0,
        facets: [],
        filters: EMPTY_PRODUCT_LISTING_FILTERS,
      };

  const { total, facets, filters } = listingResult;
  const page = clampProductListingPage(requestedPage, total, pageSize);

  if (hasQuery && !productListingFiltersEqual(parsedFilters, filters)) {
    redirect(
      buildProductListingHref(
        '/search',
        { q: query, sort, page, filters },
        { defaultSort },
      ),
    );
  }

  if (hasQuery && requestedPage !== page) {
    redirect(
      buildProductListingHref(
        '/search',
        { q: query, sort, page, filters },
        { defaultSort },
      ),
    );
  }

  const { products } = listingResult;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium">Search</h1>
          <p className="text-sm text-muted-foreground">
            Find products in your commercetools catalog.
          </p>
        </div>
        <SearchForm key={query} defaultQuery={query} />
      </div>

      {hasQuery ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
          </p>
          {total > 0 ? (
            <ProductListingControls
              filters={filters}
              mode="search"
              page={page}
              pageSize={pageSize}
              pathname="/search"
              query={query}
              showPagination={false}
              sort={sort}
              total={total}
            />
          ) : null}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <ProductListingFacets
              facets={facets}
              filters={filters}
              mode="search"
              pathname="/search"
              query={query}
              sort={sort}
            />
            <div className="min-w-0 flex-1">
              <ProductGridCompact products={products} />
            </div>
          </div>
          {total > 0 ? (
            <ProductListingControls
              filters={filters}
              mode="search"
              page={page}
              pageSize={pageSize}
              pathname="/search"
              query={query}
              showRange={false}
              showSort={false}
              sort={sort}
              total={total}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter a search term to browse products. Try &ldquo;bed&rdquo; or
          &ldquo;table&rdquo;.
        </p>
      )}
    </main>
  );
}
