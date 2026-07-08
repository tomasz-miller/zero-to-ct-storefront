import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductCardCompact } from './product-card-compact';
import type { StorefrontProduct } from '@/lib/commercetools/products';

const product: StorefrontProduct = {
  id: 'prod-1',
  name: 'Orion Double Bed',
  slug: 'orion-double-bed',
  imageUrl: 'https://example.com/orion.jpg',
  price: { centAmount: 49900, currencyCode: 'EUR' },
};

describe('ProductCardCompact', () => {
  it('links to the product detail page', () => {
    render(<ProductCardCompact product={product} />);
    const link = screen.getByRole('link', { name: /orion double bed/i });
    expect(link).toHaveAttribute('href', '/product/orion-double-bed');
  });

  it('renders formatted price', () => {
    render(<ProductCardCompact product={product} />);
    expect(screen.getByText('€499.00')).toBeInTheDocument();
  });

  it('shows fallback when price is missing', () => {
    render(<ProductCardCompact product={{ ...product, price: undefined }} />);
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it('shows fallback when image is missing', () => {
    render(<ProductCardCompact product={{ ...product, imageUrl: undefined }} />);
    expect(screen.getByText('No image')).toBeInTheDocument();
  });
});
