import { notFound, redirect } from 'next/navigation';

import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { ProductListingControls } from '@/components/product/product-listing-controls';
import { ProductListingFacets } from '@/components/product/product-listing-facets';
import { getCategoryBySlug } from '@/lib/commercetools/categories';
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
  parseProductListingFilters,
  productListingFiltersEqual,
} from '@/lib/commercetools/product-search-facets';
import { listProducts } from '@/lib/commercetools/products';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const defaultSort = getDefaultProductListingSort('category');
  const sort = parseProductListingSort(
    resolvedSearchParams.sort?.toString(),
    defaultSort,
    'category',
  );
  const parsedFilters = parseProductListingFilters(resolvedSearchParams);
  const pageSize = PRODUCT_LISTING_PAGE_SIZE;
  const requestedPage = parseProductListingPage(
    resolvedSearchParams.page?.toString(),
    pageSize,
  );
  const pathname = `/category/${slug}`;

  const listingResult = await listProducts({
    categoryId: category.id,
    limit: pageSize,
    offset: productListingOffset(requestedPage, pageSize),
    sort,
    filters: parsedFilters,
  });

  const { total, facets, filters } = listingResult;
  const page = clampProductListingPage(requestedPage, total, pageSize);

  if (!productListingFiltersEqual(parsedFilters, filters)) {
    redirect(
      buildProductListingHref(pathname, { sort, page, filters }, { defaultSort }),
    );
  }

  if (requestedPage !== page) {
    redirect(
      buildProductListingHref(pathname, { sort, page, filters }, { defaultSort }),
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">{category.name}</h1>
        <p className="text-sm text-muted-foreground">
          {total} product{total === 1 ? '' : 's'} in this category.
        </p>
      </div>

      {total > 0 ? (
        <ProductListingControls
          filters={filters}
          mode="category"
          page={page}
          pageSize={pageSize}
          pathname={pathname}
          showPagination={false}
          sort={sort}
          total={total}
        />
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ProductListingFacets
          facets={facets}
          filters={filters}
          mode="category"
          pathname={pathname}
          sort={sort}
        />
        <div className="min-w-0 flex-1">
          <ProductGridCompact products={listingResult.products} />
        </div>
      </div>

      {total > 0 ? (
        <ProductListingControls
          filters={filters}
          mode="category"
          page={page}
          pageSize={pageSize}
          pathname={pathname}
          showRange={false}
          showSort={false}
          sort={sort}
          total={total}
        />
      ) : null}
    </main>
  );
}
