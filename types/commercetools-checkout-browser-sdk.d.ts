declare module '@commercetools/checkout-browser-sdk' {
  export type CheckoutSdkMessage = {
    code?: string;
    payload?: unknown;
  };

  export type CheckoutSdkError = {
    code?: string;
  };

  export type CheckoutFlowOptions = {
    projectKey: string;
    region: string;
    sessionId: string;
    locale: string;
    logError?: boolean;
    skipPaymentSuccessPage?: boolean;
    paymentReference?: string;
    onInfo?: (message: CheckoutSdkMessage) => void;
    onWarn?: (message: CheckoutSdkMessage) => void;
    onError?: (error: CheckoutSdkError) => void;
  };

  export function checkoutFlow(options: CheckoutFlowOptions): void;
}
