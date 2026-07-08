import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SearchForm } from './search-form';

describe('SearchForm', () => {
  it('submits to /search with query field', () => {
    render(<SearchForm />);
    const form = screen.getByRole('searchbox', { name: 'Search products' }).closest('form');
    expect(form).toHaveAttribute('action', '/search');
    expect(form).toHaveAttribute('method', 'get');
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveAttribute(
      'name',
      'q',
    );
  });

  it('prefills default query value', () => {
    render(<SearchForm defaultQuery="bed" />);
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('bed');
  });
});
