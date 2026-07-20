import { describe, expect, it } from 'vitest';

import { rankProductIdsByOrderVolume } from './bestsellers';

describe('rankProductIdsByOrderVolume', () => {
  it('ranks products by total sold quantity descending', () => {
    const ranked = rankProductIdsByOrderVolume([
      {
        lineItems: [
          { productId: 'prod-a', quantity: 1 },
          { productId: 'prod-b', quantity: 3 },
        ],
      },
      {
        lineItems: [
          { productId: 'prod-a', quantity: 4 },
          { productId: 'prod-c', quantity: 2 },
        ],
      },
    ]);

    expect(ranked).toEqual(['prod-a', 'prod-b', 'prod-c']);
  });

  it('skips empty product ids and non-positive quantities', () => {
    const ranked = rankProductIdsByOrderVolume([
      {
        lineItems: [
          { productId: '', quantity: 5 },
          { productId: 'prod-a', quantity: 0 },
          { productId: 'prod-b', quantity: 2 },
        ],
      },
    ]);

    expect(ranked).toEqual(['prod-b']);
  });

  it('returns an empty list when there are no orders', () => {
    expect(rankProductIdsByOrderVolume([])).toEqual([]);
  });
});
