import { notFound, redirect } from 'next/navigation';

import { ProductGridCompact } from '@/components/product/product-grid-compact';
import { ProductListingControls } from '@/components/product/product-listing-controls';
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
import { listProducts } from '@/lib/commercetools/products';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam, sort: sortParam } = await searchParams;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const defaultSort = getDefaultProductListingSort('category');
  const sort = parseProductListingSort(sortParam, defaultSort, 'category');
  const pageSize = PRODUCT_LISTING_PAGE_SIZE;
  const requestedPage = parseProductListingPage(pageParam, pageSize);
  const pathname = `/category/${slug}`;

  const listingResult = await listProducts({
    categoryId: category.id,
    limit: pageSize,
    offset: productListingOffset(requestedPage, pageSize),
    sort,
  });

  const { total } = listingResult;
  const page = clampProductListingPage(requestedPage, total, pageSize);

  if (requestedPage !== page) {
    redirect(
      buildProductListingHref(pathname, { sort, page }, { defaultSort }),
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
          mode="category"
          page={page}
          pageSize={pageSize}
          pathname={pathname}
          showPagination={false}
          sort={sort}
          total={total}
        />
      ) : null}

      <ProductGridCompact products={listingResult.products} />

      {total > 0 ? (
        <ProductListingControls
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
