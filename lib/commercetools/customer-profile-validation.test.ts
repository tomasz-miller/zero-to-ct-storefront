import { describe, expect, it } from 'vitest';

import {
  validateAddressInput,
  validatePasswordChange,
  validateProfileUpdate,
} from './customer-profile-validation';

describe('validateProfileUpdate', () => {
  it('returns validated profile fields', () => {
    expect(
      validateProfileUpdate({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      }),
    ).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
  });

  it('rejects invalid email', () => {
    expect(
      validateProfileUpdate({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'not-an-email',
      }),
    ).toBe('Enter a valid email address');
  });

  it('requires first and last name', () => {
    expect(
      validateProfileUpdate({
        firstName: '',
        lastName: 'Doe',
        email: 'jane@example.com',
      }),
    ).toBe('First name is required');
  });
});

describe('validateAddressInput', () => {
  it('returns validated address fields', () => {
    expect(
      validateAddressInput({
        streetName: 'Main Street',
        streetNumber: '42',
        postalCode: '10115',
        city: 'Berlin',
        country: 'de',
        isDefaultShipping: true,
      }),
    ).toEqual({
      firstName: undefined,
      lastName: undefined,
      streetName: 'Main Street',
      streetNumber: '42',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
      isDefaultShipping: true,
      isDefaultBilling: false,
    });
  });

  it('rejects invalid country code', () => {
    expect(
      validateAddressInput({
        streetName: 'Main Street',
        postalCode: '10115',
        city: 'Berlin',
        country: 'Germany',
      }),
    ).toBe('Country must be a 2-letter ISO code (e.g. DE)');
  });
});

describe('validatePasswordChange', () => {
  it('returns validated password fields', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }),
    ).toEqual({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    });
  });

  it('rejects mismatched confirmation', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'Different123!',
      }),
    ).toBe('New passwords do not match');
  });

  it('rejects identical current and new password', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
      }),
    ).toBe('New password must be different from the current password');
  });
});
