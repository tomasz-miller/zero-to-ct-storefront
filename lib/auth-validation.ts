/** RFC 5321 theoretical max length for a valid email address. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Linear-time email shape check (local@domain with a dot in the domain).
 * Avoids a polynomial regex that CodeQL flags as ReDoS on crafted input.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  const atIndex = email.indexOf('@');
  if (atIndex < 1 || atIndex !== email.lastIndexOf('@')) {
    return false;
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain || /\s/.test(localPart) || /\s/.test(domain)) {
    return false;
  }

  const dotIndex = domain.indexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!isValidEmail(trimmed)) {
    return 'Enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}
