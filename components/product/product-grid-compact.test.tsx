import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CartProvider } from '@/components/cart/cart-context';
import { ProductGridCompact } from './product-grid-compact';
import type { StorefrontProduct } from '@/lib/commercetools/products';

const products: StorefrontProduct[] = [
  {
    id: 'prod-1',
    name: 'Orion Double Bed',
    slug: 'orion-double-bed',
    sku: 'ORION-BED',
    price: { centAmount: 49900, currencyCode: 'EUR' },
  },
  {
    id: 'prod-2',
    name: 'Luna Table',
    slug: 'luna-table',
    sku: 'LUNA-TABLE',
    price: { centAmount: 19900, currencyCode: 'EUR' },
  },
];

describe('ProductGridCompact', () => {
  it('shows empty state when no products', () => {
    render(<ProductGridCompact products={[]} />);
    expect(screen.getByText('No products found.')).toBeInTheDocument();
  });

  it('renders a card for each product', () => {
    render(
      <CartProvider>
        <ProductGridCompact products={products} />
      </CartProvider>,
    );
    expect(screen.getByRole('link', { name: /orion double bed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /luna table/i })).toBeInTheDocument();
  });
});
