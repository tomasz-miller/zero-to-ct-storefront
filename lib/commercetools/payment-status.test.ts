import { describe, expect, it } from 'vitest';

import {
  deriveOrderPaymentStatus,
  derivePaymentStatusFromTransactions,
  formatPaymentProvider,
  mapPaymentStateFallback,
  pickWorstPaymentStatus,
} from './payment-status';

describe('derivePaymentStatusFromTransactions', () => {
  it('returns Paid after a successful charge', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Authorization', state: 'Success', centAmount: 81793 },
        { type: 'Charge', state: 'Success', centAmount: 81793 },
      ]),
    ).toBe('Paid');
  });

  it('returns Authorized when only authorization succeeds', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Authorization', state: 'Success', centAmount: 5000 },
      ]),
    ).toBe('Authorized');
  });

  it('returns Processing for a pending authorization', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Authorization', state: 'Pending', centAmount: 5000 },
      ]),
    ).toBe('Processing');
  });

  it('returns Failed for a failed authorization', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Authorization', state: 'Failure', centAmount: 5000 },
      ]),
    ).toBe('Failed');
  });

  it('returns Failed when capture fails after authorization succeeds', () => {
    expect(
      derivePaymentStatusFromTransactions([
        {
          type: 'Authorization',
          state: 'Success',
          centAmount: 5000,
          timestamp: '2026-02-01T12:00:00.000Z',
        },
        {
          type: 'Charge',
          state: 'Failure',
          centAmount: 5000,
          timestamp: '2026-02-01T12:00:02.000Z',
        },
      ]),
    ).toBe('Failed');
  });

  it('returns Authorized when a later authorization succeeds after a failure', () => {
    expect(
      derivePaymentStatusFromTransactions([
        {
          type: 'Authorization',
          state: 'Failure',
          centAmount: 5000,
          timestamp: '2026-02-01T12:00:00.000Z',
        },
        {
          type: 'Authorization',
          state: 'Success',
          centAmount: 5000,
          timestamp: '2026-02-01T12:00:05.000Z',
        },
      ]),
    ).toBe('Authorized');
  });

  it('returns Refunded when all charged funds are refunded', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Charge', state: 'Success', centAmount: 5000 },
        { type: 'Refund', state: 'Success', centAmount: 5000 },
      ]),
    ).toBe('Refunded');
  });

  it('returns Partially refunded when only part of the charge is refunded', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Charge', state: 'Success', centAmount: 5000 },
        { type: 'Refund', state: 'Success', centAmount: 2000 },
      ]),
    ).toBe('Partially refunded');
  });

  it('returns Cancelled when authorization is cancelled', () => {
    expect(
      derivePaymentStatusFromTransactions([
        { type: 'Authorization', state: 'Success', centAmount: 5000 },
        { type: 'CancelAuthorization', state: 'Success', centAmount: 5000 },
      ]),
    ).toBe('Cancelled');
  });

  it('returns Unknown when transactions are unavailable', () => {
    expect(derivePaymentStatusFromTransactions([])).toBe('Unknown');
  });
});

describe('deriveOrderPaymentStatus', () => {
  it('falls back to order paymentState when payments are not expanded', () => {
    expect(deriveOrderPaymentStatus([], 'Paid')).toBe('Paid');
    expect(deriveOrderPaymentStatus([], 'Pending')).toBe('Processing');
  });

  it('returns the worst status across multiple payments', () => {
    expect(
      deriveOrderPaymentStatus([
        {
          transactions: [
            { type: 'Authorization', state: 'Success', centAmount: 5000 },
            { type: 'Charge', state: 'Success', centAmount: 5000 },
          ],
        },
        {
          transactions: [
            { type: 'Authorization', state: 'Failure', centAmount: 5000 },
          ],
        },
      ]),
    ).toBe('Failed');
  });
});

describe('pickWorstPaymentStatus', () => {
  it('prefers Failed over Paid', () => {
    expect(pickWorstPaymentStatus(['Paid', 'Failed'])).toBe('Failed');
  });
});

describe('mapPaymentStateFallback', () => {
  it('maps commercetools payment states to storefront labels', () => {
    expect(mapPaymentStateFallback('Paid')).toBe('Paid');
    expect(mapPaymentStateFallback('Failed')).toBe('Failed');
    expect(mapPaymentStateFallback('Pending')).toBe('Processing');
    expect(mapPaymentStateFallback('CreditOwed')).toBe('Refunded');
  });
});

describe('formatPaymentProvider', () => {
  it('maps checkout-stripe to a customer-friendly label', () => {
    expect(formatPaymentProvider('checkout-stripe')).toBe('Card via Stripe');
  });

  it('returns the raw interface for unknown providers', () => {
    expect(formatPaymentProvider('custom-psp')).toBe('custom-psp');
  });
});
