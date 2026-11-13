import type { DiscountCodeState } from '@commercetools/platform-sdk';

import { PublicError } from '@/lib/http/public-error';

/** Canonical status codes and public copy for storefront domain errors. */

export class UnauthorizedError extends PublicError {
  constructor(message = 'Sign in required') {
    super(401, 'Unauthorized', message);
    this.name = 'UnauthorizedError';
  }
}

export class CartAccessError extends PublicError {
  constructor(message = 'Cart access denied') {
    super(403, 'CartAccessDenied', message);
    this.name = 'CartAccessError';
  }
}

export class CartNotFoundError extends PublicError {
  constructor(message = 'Cart not found') {
    super(404, 'CartNotFound', message);
    this.name = 'CartNotFoundError';
  }
}

export class OutOfStockError extends PublicError {
  constructor(message = 'This product is out of stock') {
    super(409, 'OutOfStock', message);
    this.name = 'OutOfStockError';
  }
}

export class InvalidQuantityError extends PublicError {
  constructor() {
    super(
      400,
      'InvalidQuantity',
      'Quantity must be a whole number between 1 and 99',
    );
    this.name = 'InvalidQuantityError';
  }
}

export class NoDefaultAddressError extends PublicError {
  constructor(message = 'No default address configured on your account') {
    super(400, 'NoDefaultAddress', message);
    this.name = 'NoDefaultAddressError';
  }
}

export class WishlistAccessError extends PublicError {
  constructor(message = 'Wishlist access denied') {
    super(403, 'WishlistAccessDenied', message);
    this.name = 'WishlistAccessError';
  }
}

export class WishlistNotFoundError extends PublicError {
  constructor(message = 'Wishlist not found') {
    super(404, 'WishlistNotFound', message);
    this.name = 'WishlistNotFoundError';
  }
}

export class WishlistLineItemNotFoundError extends PublicError {
  constructor(message = 'Wishlist item not found') {
    super(404, 'WishlistItemNotFound', message);
    this.name = 'WishlistLineItemNotFoundError';
  }
}

export class ReorderUnauthorizedError extends PublicError {
  constructor(message = 'Sign in required to reorder') {
    super(401, 'Unauthorized', message);
    this.name = 'ReorderUnauthorizedError';
  }
}

export class NothingToReorderError extends PublicError {
  constructor(message = 'No available items from this order could be added to the cart') {
    super(409, 'NothingToReorder', message);
    this.name = 'NothingToReorderError';
  }
}

export class CustomerOrderNotFoundError extends PublicError {
  constructor() {
    super(404, 'OrderNotFound', 'Order not found');
    this.name = 'CustomerOrderNotFoundError';
  }
}

export class InvalidDiscountCodeError extends PublicError {
  readonly reason?: string;

  constructor(message = 'Invalid discount code', reason?: string) {
    super(422, 'InvalidDiscountCode', message);
    this.name = 'InvalidDiscountCodeError';
    this.reason = reason;
  }
}

export class DiscountCodeNotApplicableError extends PublicError {
  readonly state?: DiscountCodeState;

  constructor(
    message = 'This discount code does not apply to your cart',
    state?: DiscountCodeState,
  ) {
    super(422, 'DiscountCodeNotApplicable', message);
    this.name = 'DiscountCodeNotApplicableError';
    this.state = state;
  }
}

export class MockPaymentsDisabledError extends PublicError {
  constructor(message = 'Mock payments are disabled') {
    super(404, 'MockPaymentsDisabled', message);
    this.name = 'MockPaymentsDisabledError';
  }
}

export class MockCheckoutError extends PublicError {
  constructor(message: string) {
    super(400, 'MockCheckoutFailed', message);
    this.name = 'MockCheckoutError';
  }
}

export class MockCheckoutConflictError extends PublicError {
  constructor() {
    super(
      409,
      'OrderInProgress',
      'Your order is already being placed. Check your account before trying again.',
    );
    this.name = 'MockCheckoutConflictError';
  }
}

export class CheckoutSessionError extends PublicError {
  constructor() {
    super(
      502,
      'CheckoutUnavailable',
      'Checkout is temporarily unavailable. Please try again.',
    );
    this.name = 'CheckoutSessionError';
  }
}

export class CustomerError extends PublicError {
  constructor(code: string, message: string, status: number) {
    super(status, code, message);
    this.name = 'CustomerError';
  }
}
