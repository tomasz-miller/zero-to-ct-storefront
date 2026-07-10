const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  no_payment_integrations:
    'No active payment method is configured. Activate the Payment Integration in Merchant Center (Checkout → Applications).',
  error_loading_all_payment_integrations:
    'Payment connector failed to load. Check the CT Connect Stripe deployment logs and connector configuration.',
};

export function resolveCheckoutErrorMessage(code: string | undefined): string {
  if (!code) {
    return 'Checkout failed';
  }

  return CHECKOUT_ERROR_MESSAGES[code] ?? code;
}
