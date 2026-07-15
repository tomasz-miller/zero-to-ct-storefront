declare module '@commercetools/checkout-browser-sdk' {
  export type CheckoutSdkMessage = {
    code?: string;
    payload?: unknown;
  };

  export type CheckoutSdkError = {
    code?: string;
  };

  export type CheckoutStyles = {
    '--font-family'?: string;
    '--button'?: string;
    '--button-outline'?: string;
    '--button-hover'?: string;
    '--button-text'?: string;
    '--button-disabled'?: string;
    '--button-disabled-text'?: string;
    '--input-field-focus'?: string;
    '--checkbox'?: string;
    '--radio'?: string;
    '--spinner'?: string;
  };

  export type CheckoutFlowOptions = {
    projectKey: string;
    region: string;
    sessionId: string;
    locale: string;
    logError?: boolean;
    styles?: CheckoutStyles;
    skipPaymentSuccessPage?: boolean;
    paymentReference?: string;
    onInfo?: (message: CheckoutSdkMessage) => void;
    onWarn?: (message: CheckoutSdkMessage) => void;
    onError?: (error: CheckoutSdkError) => void;
  };

  export function checkoutFlow(options: CheckoutFlowOptions): void;
  export function close(): void;
}
