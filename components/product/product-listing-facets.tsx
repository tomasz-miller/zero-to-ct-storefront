import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  buildProductListingHref,
  getDefaultProductListingSort,
  type ProductListingMode,
  type ProductListingSort,
} from '@/lib/commercetools/product-listing-params';
import {
  EMPTY_PRODUCT_LISTING_FILTERS,
  hasActiveProductListingFilters,
  setProductListingPriceFilter,
  toggleProductListingFilterValue,
  type ProductListingFilters,
  type ProductListingPriceBucketKey,
  type StorefrontFacet,
} from '@/lib/commercetools/product-search-facets';

type ProductListingFacetsProps = {
  facets: StorefrontFacet[];
  filters: ProductListingFilters;
  mode: ProductListingMode;
  pathname: string;
  query?: string;
  sort: ProductListingSort;
};

function isPriceBucketSelected(
  filters: ProductListingFilters,
  key: string,
): boolean {
  return filters.price === key;
}

function isAttributeValueSelected(
  filters: ProductListingFilters,
  attributeName: string,
  value: string,
): boolean {
  return (filters.attributes[attributeName] ?? []).includes(value);
}

function buildFacetHref(
  props: ProductListingFacetsProps,
  nextFilters: ProductListingFilters,
): string {
  return buildProductListingHref(
    props.pathname,
    {
      q: props.query,
      sort: props.sort,
      page: 1,
      filters: nextFilters,
    },
    { defaultSort: getDefaultProductListingSort(props.mode) },
  );
}

export function ProductListingFacets(props: ProductListingFacetsProps) {
  const { facets, filters } = props;

  if (facets.length === 0) {
    return null;
  }

  return (
    <aside className="flex w-full flex-col gap-6 lg:w-56 lg:shrink-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Filters</h2>
        {hasActiveProductListingFilters(filters) ? (
          <Button
            render={
              <Link href={buildFacetHref(props, EMPTY_PRODUCT_LISTING_FILTERS)} />
            }
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        ) : null}
      </div>

      {facets.map((facet) => (
        <section key={facet.id} className="flex flex-col gap-2">
          <h3 className="text-sm text-muted-foreground">{facet.label}</h3>
          <ul className="flex flex-col gap-1">
            {facet.buckets.map((bucket) => {
              const isSelected =
                facet.kind === 'price'
                  ? isPriceBucketSelected(filters, bucket.key)
                  : isAttributeValueSelected(filters, facet.id, bucket.key);

              const nextFilters =
                facet.kind === 'price'
                  ? setProductListingPriceFilter(
                      filters,
                      isSelected
                        ? undefined
                        : (bucket.key as ProductListingPriceBucketKey),
                    )
                  : toggleProductListingFilterValue(
                      filters,
                      facet.id,
                      bucket.key,
                    );

              return (
                <li key={`${facet.id}-${bucket.key}`}>
                  <Button
                    className="h-auto w-full justify-between px-2 py-1.5 text-left font-normal"
                    render={
                      <Link href={buildFacetHref(props, nextFilters)} />
                    }
                    size="sm"
                    variant={isSelected ? 'secondary' : 'ghost'}
                  >
                    <span>{bucket.label}</span>
                    <span className="text-muted-foreground">{bucket.count}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
