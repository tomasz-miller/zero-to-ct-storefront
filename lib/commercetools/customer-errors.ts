import { parseCtError } from './ct-errors';
import { CustomerError } from './domain-errors';

const PASSWORD_RESET_INVALID = 'Password reset link is invalid or expired';

/**
 * Maps a commercetools customer error to a shopper-safe `CustomerError`.
 * Only whitelisted codes are mapped; everything else returns `null` and the
 * caller rethrows the original error (generic 500).
 */
export function mapCustomerCtError(
  error: unknown,
  context?: 'password-reset',
): CustomerError | null {
  const { code } = parseCtError(error);

  switch (code) {
    case 'InvalidCredentials':
      return new CustomerError(code, 'Invalid email or password', 401);
    case 'DuplicateField':
      return new CustomerError(
        code,
        'An account with this email already exists',
        409,
      );
    case 'ExpiredCustomerPasswordToken':
      return new CustomerError(code, PASSWORD_RESET_INVALID, 400);
    case 'ResourceNotFound':
      // UNVERIFIED that commercetools returns this for an unknown reset token.
      return context === 'password-reset'
        ? new CustomerError(code, PASSWORD_RESET_INVALID, 400)
        : null;
    case 'ConcurrentModification':
      return new CustomerError(
        code,
        'Your profile was updated elsewhere. Refresh the page and try again.',
        409,
      );
    case 'InvalidCurrentPassword':
      return new CustomerError(code, 'Current password is incorrect', 400);
    default:
      return null;
  }
}
