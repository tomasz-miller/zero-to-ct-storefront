import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CartProvider } from '@/components/cart/cart-context';
import { ProductCardCompact } from './product-card-compact';
import type { StorefrontProduct } from '@/lib/commercetools/products';

function renderCard(product: StorefrontProduct) {
  return render(
    <CartProvider>
      <ProductCardCompact product={product} />
    </CartProvider>,
  );
}

const product: StorefrontProduct = {
  id: 'prod-1',
  name: 'Orion Double Bed',
  slug: 'orion-double-bed',
  sku: 'ORION-BED',
  imageUrl: 'https://example.com/orion.jpg',
  price: { centAmount: 49900, currencyCode: 'EUR' },
};

describe('ProductCardCompact', () => {
  it('links to the product detail page', () => {
    renderCard(product);
    const link = screen.getByRole('link', { name: /orion double bed/i });
    expect(link).toHaveAttribute('href', '/product/orion-double-bed');
  });

  it('renders formatted price', () => {
    renderCard(product);
    expect(screen.getByText('€499.00')).toBeInTheDocument();
  });

  it('shows fallback when price is missing', () => {
    renderCard({ ...product, price: undefined });
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it('shows fallback when image is missing', () => {
    renderCard({ ...product, imageUrl: undefined });
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders add to cart button', () => {
    renderCard(product);
    expect(
      screen.getByRole('button', { name: /add to cart/i }),
    ).toBeInTheDocument();
  });

  it('disables add to cart when sku is missing', () => {
    renderCard({ ...product, sku: undefined });
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });

  it('truncates long product names to two lines', () => {
    renderCard({
      ...product,
      name: 'Nala Two-Seater Sofa With Extra Long Descriptive Product Name',
    });

    const title = screen.getByText(
      /Nala Two-Seater Sofa With Extra Long Descriptive Product Name/i,
    );
    expect(title).toHaveClass('line-clamp-2');
    expect(title).toHaveClass('min-h-11');
  });
});
