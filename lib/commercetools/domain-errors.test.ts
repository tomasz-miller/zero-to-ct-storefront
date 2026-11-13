import { describe, expect, it } from 'vitest';

import { PublicError } from '@/lib/http/public-error';

import {
  CartAccessError,
  CartNotFoundError,
  CheckoutSessionError,
  CustomerError,
  CustomerOrderNotFoundError,
  DiscountCodeNotApplicableError,
  InvalidDiscountCodeError,
  InvalidQuantityError,
  MockCheckoutConflictError,
  MockCheckoutError,
  MockPaymentsDisabledError,
  NoDefaultAddressError,
  NothingToReorderError,
  OutOfStockError,
  ReorderUnauthorizedError,
  UnauthorizedError,
  WishlistAccessError,
  WishlistLineItemNotFoundError,
  WishlistNotFoundError,
} from './domain-errors';

describe('domain errors', () => {
  it.each([
    [new UnauthorizedError(), 401, 'Unauthorized', 'Sign in required'],
    [new CartAccessError(), 403, 'CartAccessDenied', 'Cart access denied'],
    [new CartNotFoundError(), 404, 'CartNotFound', 'Cart not found'],
    [new OutOfStockError(), 409, 'OutOfStock', 'This product is out of stock'],
    [
      new NoDefaultAddressError(),
      400,
      'NoDefaultAddress',
      'No default address configured on your account',
    ],
    [
      new InvalidQuantityError(),
      400,
      'InvalidQuantity',
      'Quantity must be a whole number between 1 and 99',
    ],
    [new WishlistAccessError(), 403, 'WishlistAccessDenied', 'Wishlist access denied'],
    [new WishlistNotFoundError(), 404, 'WishlistNotFound', 'Wishlist not found'],
    [
      new WishlistLineItemNotFoundError(),
      404,
      'WishlistItemNotFound',
      'Wishlist item not found',
    ],
    [
      new ReorderUnauthorizedError(),
      401,
      'Unauthorized',
      'Sign in required to reorder',
    ],
    [
      new NothingToReorderError(),
      409,
      'NothingToReorder',
      'No available items from this order could be added to the cart',
    ],
    [new CustomerOrderNotFoundError(), 404, 'OrderNotFound', 'Order not found'],
    [
      new InvalidDiscountCodeError(),
      422,
      'InvalidDiscountCode',
      'Invalid discount code',
    ],
    [
      new DiscountCodeNotApplicableError(),
      422,
      'DiscountCodeNotApplicable',
      'This discount code does not apply to your cart',
    ],
    [
      new MockPaymentsDisabledError(),
      404,
      'MockPaymentsDisabled',
      'Mock payments are disabled',
    ],
    [
      new MockCheckoutError('Select a shipping method'),
      400,
      'MockCheckoutFailed',
      'Select a shipping method',
    ],
    [
      new MockCheckoutConflictError(),
      409,
      'OrderInProgress',
      'Your order is already being placed. Check your account before trying again.',
    ],
    [
      new CheckoutSessionError(),
      502,
      'CheckoutUnavailable',
      'Checkout is temporarily unavailable. Please try again.',
    ],
    [
      new CustomerError(
        'DuplicateField',
        'An account with this email already exists',
        409,
      ),
      409,
      'DuplicateField',
      'An account with this email already exists',
    ],
  ])('%s carries its canonical status, code and message', (error, status, code, message) => {
    expect(error).toBeInstanceOf(PublicError);
    expect(error).toMatchObject({ status, code, message });
  });
});
