import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductListingFacets } from './product-listing-facets';

describe('ProductListingFacets', () => {
  it('renders facet buckets with toggle links', () => {
    render(
      <ProductListingFacets
        facets={[
          {
            id: 'color-label',
            label: 'Colour Label',
            kind: 'attribute',
            buckets: [{ key: 'Blue', label: 'Blue', count: 4 }],
          },
        ]}
        filters={{ attributes: {} }}
        mode="category"
        pathname="/category/furniture"
        sort="newest"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Blue/i })).toHaveAttribute(
      'href',
      '/category/furniture?attr.color-label=Blue',
    );
  });

  it('renders clear link when filters are active', () => {
    render(
      <ProductListingFacets
        facets={[
          {
            id: 'price',
            label: 'Price',
            kind: 'price',
            buckets: [{ key: 'under-100', label: 'Under €100', count: 2 }],
          },
        ]}
        filters={{
          attributes: { 'color-label': ['Blue'] },
          price: 'under-100',
        }}
        mode="search"
        pathname="/search"
        query="table"
        sort="relevance"
      />,
    );

    expect(screen.getByRole('link', { name: 'Clear' })).toHaveAttribute(
      'href',
      '/search?q=table',
    );
  });
});
