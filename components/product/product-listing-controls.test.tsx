import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductListingControls } from '@/components/product/product-listing-controls';

describe('ProductListingControls', () => {
  it('renders sort links that reset pagination', () => {
    render(
      <ProductListingControls
        mode="search"
        page={2}
        pageSize={24}
        pathname="/search"
        query="bed"
        showPagination={false}
        sort="relevance"
        total={60}
      />,
    );

    expect(screen.getByText('Showing 25–48 of 60')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Price: low to high' })).toHaveAttribute(
      'href',
      '/search?q=bed&sort=price-asc',
    );
    expect(
      screen.queryByRole('navigation', { name: 'Product listing pagination' }),
    ).not.toBeInTheDocument();
  });

  it('renders pagination links without duplicate sort controls', () => {
    render(
      <ProductListingControls
        mode="category"
        page={1}
        pageSize={24}
        pathname="/category/bedroom"
        showRange={false}
        showSort={false}
        sort="newest"
        total={50}
      />,
    );

    expect(screen.queryByText('Sort by')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/category/bedroom?page=2',
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});
