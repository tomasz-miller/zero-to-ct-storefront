import { redirect } from 'next/navigation';

import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { ProductListingControls } from '@/components/product/product-listing-controls';
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
import { listProducts } from '@/lib/commercetools/products';

type SearchPageProps = {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam, sort: sortParam } = await searchParams;
  const query = q?.trim() ?? '';
  const hasQuery = query.length > 0;
  const defaultSort = getDefaultProductListingSort('search');
  const sort = parseProductListingSort(sortParam, defaultSort, 'search');
  const pageSize = PRODUCT_LISTING_PAGE_SIZE;
  const requestedPage = parseProductListingPage(pageParam, pageSize);

  const listingResult = hasQuery
    ? await listProducts({
        query,
        limit: pageSize,
        offset: productListingOffset(requestedPage, pageSize),
        sort,
      })
    : { products: [], total: 0 };

  const { total } = listingResult;
  const page = clampProductListingPage(requestedPage, total, pageSize);

  if (hasQuery && requestedPage !== page) {
    redirect(
      buildProductListingHref(
        '/search',
        { q: query, sort, page },
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
        <SearchForm defaultQuery={query} />
      </div>

      {hasQuery ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
          </p>
          {total > 0 ? (
            <ProductListingControls
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
          <ProductGridCompact products={products} />
          {total > 0 ? (
            <ProductListingControls
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
