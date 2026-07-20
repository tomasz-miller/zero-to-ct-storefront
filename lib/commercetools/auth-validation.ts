import { isValidEmail } from '@/lib/auth-validation';

export { isValidEmail };

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function validateLoginBody(body: {
  email?: string;
  password?: string;
}): { email: string; password: string } | string {
  const email = body.email?.trim();
  const password = body.password ?? '';

  if (!email || !isValidEmail(email)) {
    return 'A valid email is required';
  }
  if (!password) {
    return 'Password is required';
  }

  return { email, password };
}

export function validateRegisterBody(body: {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
}): { email: string; password: string; firstName: string; lastName: string } | string {
  const email = body.email?.trim();
  const password = body.password ?? '';
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const confirmPassword = body.confirmPassword ?? password;

  if (!firstName) {
    return 'First name is required';
  }
  if (!lastName) {
    return 'Last name is required';
  }
  if (!email || !isValidEmail(email)) {
    return 'A valid email is required';
  }
  if (!isValidPassword(password)) {
    return 'Password must be at least 8 characters';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return { email, password, firstName, lastName };
}

export function validateForgotPasswordBody(body: {
  email?: string;
}): { email: string } | string {
  const email = body.email?.trim();

  if (!email || !isValidEmail(email)) {
    return 'A valid email is required';
  }

  return { email };
}

export function validateResetPasswordBody(body: {
  token?: string;
  newPassword?: string;
}): { token: string; newPassword: string } | string {
  const token = body.token?.trim();
  const newPassword = body.newPassword ?? '';

  if (!token) {
    return 'Reset token is required';
  }
  if (!isValidPassword(newPassword)) {
    return 'Password must be at least 8 characters';
  }

  return { token, newPassword };
}
