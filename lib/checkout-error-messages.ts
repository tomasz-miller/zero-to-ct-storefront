const PAYMENT_UNAVAILABLE =
  'Payment is temporarily unavailable. Please try again later.';
const SESSION_EXPIRED =
  'Your checkout session expired. Reload the page to continue.';
const PAYMENT_FAILED =
  'Payment failed. Check your payment details or try another payment method.';
const CHECKOUT_NOT_LOADED =
  'Checkout could not be loaded. Reload the page to try again.';
const GENERIC_MESSAGE = 'Something went wrong during checkout. Please try again.';

// Only no_payment_integrations and error_loading_all_payment_integrations are
// confirmed in this repo; the other codes are unverified (the Checkout docs list
// message type names, not code strings). Unknown codes fall back to the generic text.
const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  no_payment_integrations: PAYMENT_UNAVAILABLE,
  error_loading_all_payment_integrations: PAYMENT_UNAVAILABLE,
  payment_integration_loading_error: PAYMENT_UNAVAILABLE,
  connector_error: PAYMENT_UNAVAILABLE,
  expired_session: SESSION_EXPIRED,
  failed_to_refresh_session: SESSION_EXPIRED,
  payment_failed: PAYMENT_FAILED,
  init_error: CHECKOUT_NOT_LOADED,
  init_timeout: CHECKOUT_NOT_LOADED,
};

export function resolveCheckoutErrorMessage(code: string | undefined): string {
  if (!code || !Object.hasOwn(CHECKOUT_ERROR_MESSAGES, code)) {
    return GENERIC_MESSAGE;
  }

  return CHECKOUT_ERROR_MESSAGES[code] ?? GENERIC_MESSAGE;
}

export function logCheckoutSdkMessage(message: {
  code?: string;
  correlationId?: string;
}): void {
  console.error('[checkout]', {
    code: message.code,
    correlationId: message.correlationId,
  });
}
