import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddToCartButton } from './add-to-cart-button';
import { CartProvider } from '@/components/cart/cart-context';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderButton(props: Partial<
  React.ComponentProps<typeof AddToCartButton>
> = {}) {
  return render(
    <CartProvider>
      <AddToCartButton sku="SKU-001" {...props} />
    </CartProvider>,
  );
}

function mockAddToCart() {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ cart: { itemCount: 3 } }),
  } as Response);
}

function requestBody(fetchMock: ReturnType<typeof mockAddToCart>) {
  const init = fetchMock.mock.calls[0]?.[1];
  return JSON.parse(String(init?.body));
}

describe('AddToCartButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits the quantity field by default', () => {
    renderButton();
    expect(screen.queryByRole('textbox', { name: 'Quantity' })).toBeNull();
    expect(screen.queryByRole('spinbutton', { name: 'Quantity' })).toBeNull();
  });

  it('renders a quantity field when enabled', () => {
    renderButton({ showQuantity: true });
    expect(screen.getByLabelText('Quantity')).toHaveValue('1');
  });

  it('posts quantity 1 when the field is hidden', async () => {
    const user = userEvent.setup();
    const fetchMock = mockAddToCart();

    renderButton();
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toEqual({ sku: 'SKU-001', quantity: 1 });
  });

  it('posts the stepped quantity', async () => {
    const user = userEvent.setup();
    const fetchMock = mockAddToCart();

    renderButton({ showQuantity: true });
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toEqual({ sku: 'SKU-001', quantity: 3 });
  });

  it('does not decrement below one', async () => {
    const user = userEvent.setup();
    renderButton({ showQuantity: true });

    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));

    expect(screen.getByLabelText('Quantity')).toHaveValue('1');
  });

  it('clamps quantity to available stock', async () => {
    const user = userEvent.setup();
    renderButton({ showQuantity: true, maxQuantity: 2 });

    const increase = screen.getByRole('button', { name: 'Increase quantity' });
    await user.click(increase);
    await user.click(increase);

    expect(screen.getByLabelText('Quantity')).toHaveValue('2');
  });

  it('disables the quantity field when out of stock', () => {
    renderButton({ showQuantity: true, outOfStock: true });

    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
    expect(screen.getByLabelText('Quantity')).toBeDisabled();
  });
});
