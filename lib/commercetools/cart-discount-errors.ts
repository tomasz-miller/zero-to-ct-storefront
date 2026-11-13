import { getCtErrorObjects } from './ct-errors';
import {
  DiscountCodeNotApplicableError,
  InvalidDiscountCodeError,
} from './domain-errors';

export { DiscountCodeNotApplicableError, InvalidDiscountCodeError };

export function mapDiscountCodeCartError(error: unknown): Error {
  const first = getCtErrorObjects(error)[0];

  if (first?.code === 'InvalidField' && first.discountCode) {
    return new InvalidDiscountCodeError(
      'Discount code not found. Check the code and try again.',
      first.reason,
    );
  }

  if (first?.code === 'DiscountCodeNonApplicable') {
    return new DiscountCodeNotApplicableError();
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
