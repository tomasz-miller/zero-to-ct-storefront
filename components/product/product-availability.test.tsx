import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductAvailability } from './product-availability';

describe('ProductAvailability', () => {
  it('renders nothing for in-stock without showInStock', () => {
    const { container } = render(
      <ProductAvailability
        availability={{ isOnStock: true, status: 'in_stock' }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders In stock when showInStock is true', () => {
    render(
      <ProductAvailability
        availability={{ isOnStock: true, status: 'in_stock' }}
        showInStock
      />,
    );

    expect(screen.getByText('In stock')).toBeInTheDocument();
  });

  it('renders Only X left for low stock', () => {
    render(
      <ProductAvailability
        availability={{
          isOnStock: true,
          availableQuantity: 3,
          status: 'low_stock',
        }}
      />,
    );

    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
  });

  it('renders Low stock when quantity is missing', () => {
    render(
      <ProductAvailability
        availability={{ isOnStock: true, status: 'low_stock' }}
      />,
    );

    expect(screen.getByText('Low stock')).toBeInTheDocument();
  });

  it('renders Out of stock', () => {
    render(
      <ProductAvailability
        availability={{ isOnStock: false, status: 'out_of_stock' }}
      />,
    );

    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });
});
