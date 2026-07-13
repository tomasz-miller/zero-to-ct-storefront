import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CategoryNav } from '@/components/layout/category-nav';
import type { StorefrontCategory } from '@/lib/commercetools/categories';

const categories: StorefrontCategory[] = [
  {
    id: 'cat-furniture',
    key: 'furniture',
    name: 'Furniture',
    slug: 'furniture',
    orderHint: '0.1',
    children: [
      {
        id: 'cat-bedroom',
        key: 'bedroom',
        name: 'Bedroom',
        slug: 'bedroom',
        parentId: 'cat-furniture',
        orderHint: '0.2',
        children: [
          {
            id: 'cat-beds',
            key: 'beds',
            name: 'Beds',
            slug: 'beds',
            parentId: 'cat-bedroom',
            orderHint: '0.3',
            children: [],
          },
        ],
      },
    ],
  },
];

describe('CategoryNav', () => {
  it('renders browse categories trigger', () => {
    render(<CategoryNav categories={categories} />);

    expect(
      screen.getByRole('button', { name: 'Browse categories' }),
    ).toBeInTheDocument();
  });

  it('renders nothing when category list is empty', () => {
    const { container } = render(<CategoryNav categories={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nested category trees without error', () => {
    render(<CategoryNav categories={categories} />);

    expect(
      screen.getByRole('button', { name: 'Browse categories' }),
    ).toBeInTheDocument();
  });
});
