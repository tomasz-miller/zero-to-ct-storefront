import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

import { SearchForm } from './search-form';

describe('SearchForm', () => {
  it('navigates to /search when submitted', () => {
    render(<SearchForm />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Search products' }), {
      target: { value: 'bed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(pushMock).toHaveBeenCalledWith('/search?q=bed');
  });

  it('prefills default query value', () => {
    render(<SearchForm defaultQuery="bed" />);
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue(
      'bed',
    );
  });

  it('loads suggestions from the BFF endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ suggestions: ['Double bed'] }), {
        status: 200,
      }),
    );

    render(<SearchForm />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Search products' }), {
      target: { value: 'be' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/search/suggestions?q=be',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    fetchMock.mockRestore();
  });
});
