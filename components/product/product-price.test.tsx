import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductPrice } from './product-price';
import type { StorefrontPrice } from '@/lib/commercetools/product-mappers';

describe('ProductPrice', () => {
  it('renders a single price', () => {
    const price: StorefrontPrice = {
      centAmount: 49900,
      currencyCode: 'EUR',
    };

    render(<ProductPrice price={price} />);
    expect(screen.getByText('€499.00')).toBeInTheDocument();
  });

  it('renders discounted and original prices', () => {
    const price: StorefrontPrice = {
      centAmount: 42415,
      currencyCode: 'EUR',
      originalCentAmount: 49900,
      isDiscounted: true,
    };

    render(<ProductPrice price={price} />);
    expect(screen.getByText('€424.15')).toBeInTheDocument();
    expect(screen.getByText('€499.00')).toHaveClass('line-through');
  });
});
