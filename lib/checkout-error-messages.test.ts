import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  logCheckoutSdkMessage,
  resolveCheckoutErrorMessage,
} from './checkout-error-messages';

describe('resolveCheckoutErrorMessage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never shows setup instructions or raw codes', () => {
    for (const code of [
      'no_payment_integrations',
      'error_loading_all_payment_integrations',
      'some_new_code',
      undefined,
    ]) {
      expect(resolveCheckoutErrorMessage(code)).not.toMatch(
        /Merchant Center|Connect|Stripe|_/,
      );
    }
    expect(resolveCheckoutErrorMessage('some_new_code')).toBe(
      'Something went wrong during checkout. Please try again.',
    );
  });

  it.each([
    [
      'no_payment_integrations',
      'Payment is temporarily unavailable. Please try again later.',
    ],
    [
      'expired_session',
      'Your checkout session expired. Reload the page to continue.',
    ],
    [
      'payment_failed',
      'Payment failed. Check your payment details or try another payment method.',
    ],
    [
      'init_timeout',
      'Checkout could not be loaded. Reload the page to try again.',
    ],
  ])('maps %s', (code, text) =>
    expect(resolveCheckoutErrorMessage(code)).toBe(text),
  );

  it('returns a generic message when code is missing', () => {
    expect(resolveCheckoutErrorMessage(undefined)).toBe(
      'Something went wrong during checkout. Please try again.',
    );
  });

  it('logs code and correlation id', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    logCheckoutSdkMessage({ code: 'payment_failed', correlationId: 'c-1' });
    expect(log).toHaveBeenCalledWith('[checkout]', {
      code: 'payment_failed',
      correlationId: 'c-1',
    });
  });
});
