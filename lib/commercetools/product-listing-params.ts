export const PRODUCT_LISTING_PAGE_SIZE = 24;

/** commercetools Product Search returns at most 10_000 results via offset pagination. */
export const PRODUCT_SEARCH_MAX_RESULTS = 10_000;

export const PRODUCT_LISTING_SORTS = [
  'relevance',
  'newest',
  'price-asc',
  'price-desc',
] as const;

export type ProductListingSort = (typeof PRODUCT_LISTING_SORTS)[number];

export type ProductListingMode = 'search' | 'category';

const SORT_LABELS: Record<ProductListingSort, string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

export function getDefaultProductListingSort(
  mode: ProductListingMode,
): ProductListingSort {
  return mode === 'search' ? 'relevance' : 'newest';
}

export function getProductListingSortOptions(
  mode: ProductListingMode,
): ProductListingSort[] {
  if (mode === 'search') {
    return [...PRODUCT_LISTING_SORTS];
  }

  return ['newest', 'price-asc', 'price-desc'];
}

export function getProductListingSortLabel(sort: ProductListingSort): string {
  return SORT_LABELS[sort];
}

export function parseProductListingSort(
  value: string | undefined,
  defaultSort: ProductListingSort,
  mode?: ProductListingMode,
): ProductListingSort {
  if (
    value &&
    PRODUCT_LISTING_SORTS.includes(value as ProductListingSort)
  ) {
    const parsed = value as ProductListingSort;

    if (mode === 'category' && parsed === 'relevance') {
      return defaultSort;
    }

    return parsed;
  }

  return defaultSort;
}

export function getMaxProductListingPage(pageSize: number): number {
  const maxOffset = PRODUCT_SEARCH_MAX_RESULTS - pageSize;

  return Math.max(1, Math.floor(maxOffset / pageSize) + 1);
}

export function parseProductListingPage(
  value: string | undefined,
  pageSize: number = PRODUCT_LISTING_PAGE_SIZE,
): number {
  const page = Number(value ?? '1');

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.floor(page), getMaxProductListingPage(pageSize));
}

export function clampProductListingPage(
  page: number,
  total: number,
  pageSize: number,
): number {
  const cappedByApi = Math.min(page, getMaxProductListingPage(pageSize));

  if (total <= 0) {
    return cappedByApi;
  }

  return Math.min(cappedByApi, productListingTotalPages(total, pageSize));
}

export function productListingOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function productListingTotalPages(
  total: number,
  pageSize: number,
): number {
  if (total <= 0) {
    return 1;
  }

  return Math.ceil(total / pageSize);
}

import {
  serializeProductListingFilters,
  type ProductListingFilters,
} from './product-search-facets';

export type ProductListingUrlParams = {
  q?: string;
  sort?: ProductListingSort;
  page?: number;
  filters?: ProductListingFilters;
};

export function buildProductListingHref(
  pathname: string,
  params: ProductListingUrlParams,
  options: { defaultSort: ProductListingSort },
): string {
  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set('q', params.q);
  }

  if (params.sort && params.sort !== options.defaultSort) {
    searchParams.set('sort', params.sort);
  }

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page));
  }

  for (const [key, value] of Object.entries(
    serializeProductListingFilters(params.filters ?? { attributes: {} }),
  )) {
    searchParams.set(key, value);
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function formatProductListingRange(options: {
  page: number;
  pageSize: number;
  total: number;
}): string | null {
  const { pageSize, total } = options;

  if (total <= 0) {
    return null;
  }

  const page = clampProductListingPage(options.page, total, pageSize);
  const start = productListingOffset(page, pageSize) + 1;
  const end = Math.min(page * pageSize, total);

  if (start > end) {
    return null;
  }

  return `Showing ${start}–${end} of ${total}`;
}

export function getProductListingPageNumbers(options: {
  page: number;
  totalPages: number;
  maxVisible?: number;
}): number[] {
  const { page, totalPages, maxVisible = 5 } = options;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
