import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SiteFooter } from './site-footer';

vi.mock('@/components/layout/store-brand', () => ({
  StoreBrand: () => <div data-testid="store-brand">Store brand</div>,
}));

vi.mock('@/lib/store-brand', () => ({
  getStoreBrandConfig: () => ({
    name: 'Zero to CT storefront',
    emphasis: 'CT',
  }),
}));

describe('SiteFooter', () => {
  it('renders shop navigation links', () => {
    render(<SiteFooter />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Search products' })).toHaveAttribute(
      'href',
      '/search',
    );
    expect(screen.getByRole('link', { name: 'Shopping cart' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });

  it('renders copyright with store name', () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/© \d{4} Zero to CT storefront\. All rights reserved\./),
    ).toBeInTheDocument();
  });

  it('renders commercetools attribution', () => {
    render(<SiteFooter />);

    expect(screen.getByRole('link', { name: 'commercetools' })).toHaveAttribute(
      'href',
      'https://commercetools.com',
    );
  });
});
