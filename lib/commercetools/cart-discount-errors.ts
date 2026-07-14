import type { DiscountCodeState } from '@commercetools/platform-sdk';

export class InvalidDiscountCodeError extends Error {
  readonly reason?: string;

  constructor(message = 'Invalid discount code', reason?: string) {
    super(message);
    this.name = 'InvalidDiscountCodeError';
    this.reason = reason;
  }
}

export class DiscountCodeNotApplicableError extends Error {
  readonly state?: DiscountCodeState;

  constructor(
    message = 'This discount code does not apply to your cart',
    state?: DiscountCodeState,
  ) {
    super(message);
    this.name = 'DiscountCodeNotApplicableError';
    this.state = state;
  }
}

type CtErrorBody = {
  errors?: Array<{
    code?: string;
    message?: string;
    reason?: string;
    discountCode?: string;
  }>;
  message?: string;
};

function extractCtErrors(error: unknown): CtErrorBody['errors'] {
  if (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof (error as { body?: unknown }).body === 'object' &&
    (error as { body: CtErrorBody }).body !== null
  ) {
    return (error as { body: CtErrorBody }).body.errors;
  }

  return undefined;
}

export function mapDiscountCodeCartError(error: unknown): Error {
  const errors = extractCtErrors(error);
  const first = errors?.[0];

  if (first?.code === 'InvalidField' && first.discountCode) {
    return new InvalidDiscountCodeError(
      'Discount code not found. Check the code and try again.',
      first.reason,
    );
  }

  if (first?.code === 'DiscountCodeNonApplicable') {
    return new DiscountCodeNotApplicableError(
      first.message ?? 'This discount code does not apply to your cart.',
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Failed to update discount code');
}

export function discountCodeUserMessage(error: unknown): string {
  if (error instanceof InvalidDiscountCodeError) {
    return error.message;
  }

  if (error instanceof DiscountCodeNotApplicableError) {
    return error.message;
  }

  return 'Could not apply discount code. Please try again.';
}
