import { describe, expect, it } from 'vitest';

import { resolveCheckoutErrorMessage } from './checkout-error-messages';

describe('resolveCheckoutErrorMessage', () => {
  it('maps no_payment_integrations to a setup hint', () => {
    expect(resolveCheckoutErrorMessage('no_payment_integrations')).toContain(
      'No active payment method',
    );
  });

  it('maps error_loading_all_payment_integrations to a connector hint', () => {
    expect(
      resolveCheckoutErrorMessage('error_loading_all_payment_integrations'),
    ).toContain('Payment connector failed to load');
  });

  it('returns the code when no mapping exists', () => {
    expect(resolveCheckoutErrorMessage('unknown_error')).toBe('unknown_error');
  });

  it('returns a generic message when code is missing', () => {
    expect(resolveCheckoutErrorMessage(undefined)).toBe('Checkout failed');
  });
});
