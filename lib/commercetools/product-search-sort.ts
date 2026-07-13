import type { ProductListingSort } from './product-listing-params';

type ProductSearchSortItem = {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max';
  filter?: {
    exact: {
      field: string;
      value: string;
    };
  };
};

export function buildProductSearchSort(
  sort: ProductListingSort,
  currency: string,
): ProductSearchSortItem[] {
  switch (sort) {
    case 'relevance':
      return [{ field: 'score', order: 'desc' }];
    case 'newest':
      return [{ field: 'createdAt', order: 'desc' }];
    case 'price-asc':
      return [
        {
          field: 'variants.prices.centAmount',
          order: 'asc',
          mode: 'min',
          filter: {
            exact: {
              field: 'variants.prices.currencyCode',
              value: currency,
            },
          },
        },
      ];
    case 'price-desc':
      return [
        {
          field: 'variants.prices.centAmount',
          order: 'desc',
          mode: 'max',
          filter: {
            exact: {
              field: 'variants.prices.currencyCode',
              value: currency,
            },
          },
        },
      ];
  }
}
