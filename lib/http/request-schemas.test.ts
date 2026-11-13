import { describe, expect, it } from 'vitest';

import {
  AddCartItemBodySchema,
  LoginBodySchema,
  MarketBodySchema,
  ReorderBodySchema,
} from './request-schemas';

describe('request schemas', () => {
  it('trims sku and defaults quantity', () =>
    expect(AddCartItemBodySchema.parse({ sku: ' A ' })).toEqual({
      sku: 'A',
      quantity: 1,
    }));

  it.each([1.5, 0, 100, '2', 1e9])('rejects quantity %s', (quantity) =>
    expect(AddCartItemBodySchema.safeParse({ sku: 'A', quantity }).success).toBe(
      false,
    ),
  );

  it('rejects a non-string sku', () =>
    expect(AddCartItemBodySchema.safeParse({ sku: 1 }).success).toBe(false));

  it('rejects an unknown market with the fixed message', () => {
    const r = MarketBodySchema.safeParse({ country: 'FR' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(
      'country must be one of DE, GB, or US',
    );
  });

  it('defaults login fields and rejects wrong types', () => {
    expect(LoginBodySchema.parse({})).toEqual({ email: '', password: '' });
    expect(LoginBodySchema.safeParse({ email: 1 }).success).toBe(false);
  });

  it.each(['.', '..', ''])('rejects order id %j', (orderId) =>
    expect(ReorderBodySchema.safeParse({ orderId }).success).toBe(false),
  );
});
