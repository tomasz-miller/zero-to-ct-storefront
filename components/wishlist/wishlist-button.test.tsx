import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WishlistProvider } from '@/components/wishlist/wishlist-context';
import { WishlistButton } from '@/components/wishlist/wishlist-button';

function renderButton(sku = 'SKU-001') {
  return render(
    <WishlistProvider>
      <WishlistButton sku={sku} />
    </WishlistProvider>,
  );
}

describe('WishlistButton', () => {
  it('renders save action for unsaved sku', () => {
    renderButton();

    expect(screen.getByRole('button', { name: 'Save to wishlist' })).toBeEnabled();
  });

  it('posts sku to wishlist api and updates context', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        wishlist: {
          itemCount: 1,
          skus: ['SKU-001'],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderButton();

    await user.click(screen.getByRole('button', { name: 'Save to wishlist' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/wishlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'SKU-001' }),
    });

    expect(screen.getByRole('button', { name: 'Saved to wishlist' })).toBeDisabled();
  });
});
