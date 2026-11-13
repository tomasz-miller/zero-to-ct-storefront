import * as z from 'zod';

import { MAX_LINE_ITEM_QUANTITY } from '@/lib/cart-limits';
import { isStorefrontCountry, type StorefrontCountry } from '@/lib/markets';

/**
 * Request body schemas for the BFF routes. Unknown keys are stripped. String
 * fields default to '' where the route then runs its own semantic validator
 * (keeps messages such as "Email is required").
 */

const text = (max: number) => z.string().trim().max(max);

export const resourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((id) => id !== '.' && id !== '..', { error: 'Invalid id' });

export const LoginBodySchema = z.object({
  email: text(254).default(''),
  password: z.string().max(1024).default(''),
});

export const RegisterBodySchema = LoginBodySchema.extend({
  firstName: text(100).default(''),
  lastName: text(100).default(''),
});

export const ForgotPasswordBodySchema = z.object({
  email: text(254).default(''),
});

export const ResetPasswordBodySchema = z.object({
  token: text(512).default(''),
  newPassword: z.string().max(1024).default(''),
});

const quantityMessage = 'Quantity must be a whole number between 1 and 99';

export const quantitySchema = z
  .int({ error: quantityMessage })
  .min(1, quantityMessage)
  .max(MAX_LINE_ITEM_QUANTITY, quantityMessage);

export const AddCartItemBodySchema = z.object({
  sku: text(256).min(1, 'sku is required'),
  quantity: quantitySchema.default(1),
});

export const UpdateLineItemBodySchema = z.object({
  quantity: quantitySchema,
});

export const DiscountCodeBodySchema = z.object({
  code: text(128).min(1, 'code is required'),
});

export const RemoveDiscountCodeBodySchema = z.object({
  discountCodeId: resourceIdSchema,
});

export const ReorderBodySchema = z.object({
  orderId: resourceIdSchema,
});

export const WishlistItemBodySchema = z.object({
  sku: text(256).min(1),
});

export const MarketBodySchema = z.object({
  country: z.custom<StorefrontCountry>(isStorefrontCountry, {
    error: 'country must be one of DE, GB, or US',
  }),
});

export const MockShippingBodySchema = z.object({
  shippingMethodId: text(256).default(''),
});

export const MockPayBodySchema = z.object({
  shippingMethodId: text(256).optional(),
});

export const MockPrepareBodySchema = z.object({
  email: text(256).optional(),
  firstName: text(256).optional(),
  lastName: text(256).optional(),
  streetName: text(256).optional(),
  streetNumber: text(256).optional(),
  postalCode: text(256).optional(),
  city: text(256).optional(),
});

export const ProfileUpdateBodySchema = z.object({
  firstName: text(256).optional(),
  lastName: text(256).optional(),
  email: text(256).optional(),
});

export const AddressBodySchema = z.object({
  firstName: text(256).optional(),
  lastName: text(256).optional(),
  streetName: text(256).optional(),
  streetNumber: text(256).optional(),
  postalCode: text(256).optional(),
  city: text(256).optional(),
  country: text(256).optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export const PasswordChangeBodySchema = z.object({
  currentPassword: z.string().max(1024).optional(),
  newPassword: z.string().max(1024).optional(),
  confirmPassword: z.string().max(1024).optional(),
});
