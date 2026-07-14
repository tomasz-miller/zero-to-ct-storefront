import { validateEmail, validatePassword } from '@/lib/auth-validation';

const ISO_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const MAX_NAME_LENGTH = 100;
const MAX_STREET_LENGTH = 200;
const MAX_CITY_LENGTH = 100;
const MAX_POSTAL_CODE_LENGTH = 20;

export type ProfileUpdateInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type AddressInput = {
  firstName?: string;
  lastName?: string;
  streetName?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
};

export type PasswordChangeInput = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function parseRequiredText(
  value: string | undefined,
  fieldLabel: string,
): ValidationResult<string> {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return { ok: false, error: `${fieldLabel} is required` };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `${fieldLabel} is too long` };
  }
  return { ok: true, value: trimmed };
}

export function validateProfileUpdate(
  body: ProfileUpdateInput,
): { firstName: string; lastName: string; email: string } | string {
  const firstNameResult = parseRequiredText(body.firstName, 'First name');
  if (!firstNameResult.ok) {
    return firstNameResult.error;
  }

  const lastNameResult = parseRequiredText(body.lastName, 'Last name');
  if (!lastNameResult.ok) {
    return lastNameResult.error;
  }

  const email = body.email?.trim() ?? '';
  const emailError = validateEmail(email);
  if (emailError) {
    return emailError;
  }

  return {
    firstName: firstNameResult.value,
    lastName: lastNameResult.value,
    email,
  };
}

export type ValidatedAddressInput = {
  firstName?: string;
  lastName?: string;
  streetName: string;
  streetNumber?: string;
  postalCode: string;
  city: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export function validateAddressInput(
  body: AddressInput,
  options?: { requireAllFields?: boolean },
): ValidatedAddressInput | string {
  const requireAll = options?.requireAllFields ?? true;

  const streetNameRaw = body.streetName?.trim() ?? '';
  const postalCodeRaw = body.postalCode?.trim() ?? '';
  const cityRaw = body.city?.trim() ?? '';
  const countryRaw = body.country?.trim().toUpperCase() ?? '';

  if (requireAll && !streetNameRaw) {
    return 'Street name is required';
  }
  if (streetNameRaw.length > MAX_STREET_LENGTH) {
    return 'Street name is too long';
  }

  if (requireAll && !postalCodeRaw) {
    return 'Postal code is required';
  }
  if (postalCodeRaw.length > MAX_POSTAL_CODE_LENGTH) {
    return 'Postal code is too long';
  }

  if (requireAll && !cityRaw) {
    return 'City is required';
  }
  if (cityRaw.length > MAX_CITY_LENGTH) {
    return 'City is too long';
  }

  if (requireAll && !countryRaw) {
    return 'Country is required';
  }
  if (countryRaw && !ISO_COUNTRY_PATTERN.test(countryRaw)) {
    return 'Country must be a 2-letter ISO code (e.g. DE)';
  }

  const streetNumber = trimOptional(body.streetNumber);
  if (streetNumber && streetNumber.length > MAX_STREET_LENGTH) {
    return 'Street number is too long';
  }

  const firstName = trimOptional(body.firstName);
  const lastName = trimOptional(body.lastName);

  if (firstName && firstName.length > MAX_NAME_LENGTH) {
    return 'First name is too long';
  }
  if (lastName && lastName.length > MAX_NAME_LENGTH) {
    return 'Last name is too long';
  }

  if (!requireAll && !streetNameRaw && !postalCodeRaw && !cityRaw && !countryRaw) {
    return 'No address fields to update';
  }

  return {
    firstName,
    lastName,
    streetName: streetNameRaw,
    streetNumber,
    postalCode: postalCodeRaw,
    city: cityRaw,
    country: countryRaw,
    isDefaultShipping: body.isDefaultShipping === true,
    isDefaultBilling: body.isDefaultBilling === true,
  };
}

export function validatePasswordChange(
  body: PasswordChangeInput,
): { currentPassword: string; newPassword: string } | string {
  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';
  const confirmPassword = body.confirmPassword ?? newPassword;

  if (!currentPassword) {
    return 'Current password is required';
  }

  const newPasswordError = validatePassword(newPassword);
  if (newPasswordError) {
    return newPasswordError;
  }

  if (newPassword !== confirmPassword) {
    return 'New passwords do not match';
  }

  if (currentPassword === newPassword) {
    return 'New password must be different from the current password';
  }

  return { currentPassword, newPassword };
}
