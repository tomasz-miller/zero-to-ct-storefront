import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CartProvider } from '@/components/cart/cart-context';
import { WishlistProvider } from '@/components/wishlist/wishlist-context';
import { ProductCardCompact } from './product-card-compact';
import type { StorefrontProduct } from '@/lib/commercetools/products';

function renderCard(product: StorefrontProduct) {
  return render(
    <WishlistProvider>
      <CartProvider>
        <ProductCardCompact product={product} />
      </CartProvider>
    </WishlistProvider>,
  );
}

const product: StorefrontProduct = {
  id: 'prod-1',
  name: 'Orion Double Bed',
  slug: 'orion-double-bed',
  sku: 'ORION-BED',
  imageUrl: 'https://example.com/orion.jpg',
  price: { centAmount: 49900, currencyCode: 'EUR' },
  availability: { isOnStock: true, status: 'in_stock' },
  hasMultipleVariants: false,
};

describe('ProductCardCompact', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links to the product detail page', () => {
    renderCard(product);
    const links = screen.getAllByRole('link', { name: /orion double bed/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/product/orion-double-bed');
    }
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

  it('disables add to cart when out of stock', () => {
    renderCard({
      ...product,
      availability: { isOnStock: false, status: 'out_of_stock' },
    });
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
    expect(screen.getAllByText('Out of stock')).toHaveLength(2);
  });

  it('shows low-stock badge on the card', () => {
    renderCard({
      ...product,
      availability: {
        isOnStock: true,
        availableQuantity: 2,
        status: 'low_stock',
      },
    });
    expect(screen.getByText('Only 2 left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeEnabled();
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

  it('opens quick view dialog with product details', async () => {
    const user = userEvent.setup();
    renderCard(product);

    await user.click(
      screen.getByRole('button', { name: /quick view orion double bed/i }),
    );

    const dialog = screen.getByRole('dialog', { name: /orion double bed/i });
    expect(within(dialog).getByText('In stock')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: /view full details/i }),
    ).toHaveAttribute('href', '/product/orion-double-bed');
    expect(
      within(dialog).getByRole('button', { name: /add to cart/i }),
    ).toBeInTheDocument();
  });

  it('closes quick view after a successful add to cart', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ cart: { itemCount: 1 } }),
    } as Response);

    renderCard(product);

    await user.click(
      screen.getByRole('button', { name: /quick view orion double bed/i }),
    );

    const dialog = screen.getByRole('dialog', { name: /orion double bed/i });
    await user.click(
      within(dialog).getByRole('button', { name: /add to cart/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows disabled add to cart in quick view when out of stock', async () => {
    const user = userEvent.setup();
    renderCard({
      ...product,
      availability: { isOnStock: false, status: 'out_of_stock' },
    });

    await user.click(
      screen.getByRole('button', { name: /quick view orion double bed/i }),
    );

    const dialog = screen.getByRole('dialog', { name: /orion double bed/i });
    expect(
      within(dialog).getByRole('button', { name: /out of stock/i }),
    ).toBeDisabled();
  });

  it('hides quick view add to cart for multi-variant products', async () => {
    const user = userEvent.setup();
    renderCard({ ...product, hasMultipleVariants: true });

    await user.click(
      screen.getByRole('button', { name: /quick view orion double bed/i }),
    );

    const dialog = screen.getByRole('dialog', { name: /orion double bed/i });
    expect(
      within(dialog).queryByRole('button', { name: /add to cart/i }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/showing the default variant/i),
    ).toBeInTheDocument();
  });
});
