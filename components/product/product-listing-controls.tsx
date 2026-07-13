import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  buildProductListingHref,
  formatProductListingRange,
  getDefaultProductListingSort,
  getProductListingPageNumbers,
  getProductListingSortLabel,
  getProductListingSortOptions,
  type ProductListingMode,
  type ProductListingSort,
  productListingTotalPages,
} from '@/lib/commercetools/product-listing-params';
import type { ProductListingFilters } from '@/lib/commercetools/product-search-facets';

type ProductListingControlsProps = {
  pathname: string;
  mode: ProductListingMode;
  total: number;
  page: number;
  pageSize: number;
  sort: ProductListingSort;
  query?: string;
  filters?: ProductListingFilters;
  showSort?: boolean;
  showRange?: boolean;
  showPagination?: boolean;
};

export function ProductListingControls({
  pathname,
  mode,
  total,
  page,
  pageSize,
  sort,
  query,
  filters,
  showSort = true,
  showRange = true,
  showPagination = true,
}: ProductListingControlsProps) {
  const defaultSort = getDefaultProductListingSort(mode);
  const totalPages = productListingTotalPages(total, pageSize);
  const rangeLabel = showRange
    ? formatProductListingRange({ page, pageSize, total })
    : null;
  const pageNumbers = getProductListingPageNumbers({ page, totalPages });
  const sortOptions = getProductListingSortOptions(mode);
  const sharedParams = { q: query, page, sort, filters };

  return (
    <div className="flex flex-col gap-4">
      {showSort || rangeLabel ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {rangeLabel ? (
            <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          ) : (
            <span />
          )}

          {showSort ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              {sortOptions.map((option) => (
                <Button
                  key={option}
                  render={
                    <Link
                      href={buildProductListingHref(pathname, {
                        ...sharedParams,
                        sort: option,
                        page: 1,
                      }, { defaultSort })}
                      aria-current={sort === option ? 'true' : undefined}
                    />
                  }
                  size="sm"
                  variant={sort === option ? 'secondary' : 'outline'}
                >
                  {getProductListingSortLabel(option)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showPagination && totalPages > 1 ? (
        <nav
          aria-label="Product listing pagination"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Button
            disabled={page <= 1}
            render={
              page > 1 ? (
                <Link
                  href={buildProductListingHref(
                    pathname,
                    { ...sharedParams, page: page - 1 },
                    { defaultSort },
                  )}
                />
              ) : undefined
            }
            size="sm"
            variant="outline"
          >
            Previous
          </Button>

          {pageNumbers.map((pageNumber) => (
            <Button
              key={pageNumber}
              render={
                <Link
                  href={buildProductListingHref(
                    pathname,
                    { ...sharedParams, page: pageNumber },
                    { defaultSort },
                  )}
                  aria-current={pageNumber === page ? 'page' : undefined}
                />
              }
              size="sm"
              variant={pageNumber === page ? 'secondary' : 'outline'}
            >
              {pageNumber}
            </Button>
          ))}

          <Button
            disabled={page >= totalPages}
            render={
              page < totalPages ? (
                <Link
                  href={buildProductListingHref(
                    pathname,
                    { ...sharedParams, page: page + 1 },
                    { defaultSort },
                  )}
                />
              ) : undefined
            }
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
