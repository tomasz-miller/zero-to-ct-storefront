'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/auth-context';
import { useCart } from '@/components/cart/cart-context';
import { useWishlist } from '@/components/wishlist/wishlist-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

const initialFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
};

export function LoginDialog() {
  const router = useRouter();
  const {
    authView,
    closeLoginDialog,
    loginDialogOpen,
    refreshSession,
    setAuthView,
  } = useAuth();
  const { refreshCart } = useCart();
  const { refreshWishlist } = useWishlist();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setForm(initialFormState);
    setError(null);
    setSuccessMessage(null);
    setDevResetUrl(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeLoginDialog();
      resetForm();
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function handleAuthSuccess() {
    await refreshSession();
    await refreshCart();
    await refreshWishlist();
    closeLoginDialog();
    resetForm();
    router.refresh();
  }

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? 'Sign in failed');
        return;
      }

      await handleAuthSuccess();
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? 'Registration failed');
        return;
      }

      await handleAuthSuccess();
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setDevResetUrl(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });

      const body = (await response.json()) as {
        error?: string;
        message?: string;
        devResetUrl?: string;
      };

      if (!response.ok) {
        setError(body.error ?? 'Request failed');
        return;
      }

      setSuccessMessage(
        body.message ??
          'If an account exists for this email, you will receive password reset instructions shortly.',
      );
      setDevResetUrl(body.devResetUrl ?? null);
    } catch {
      setError('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const title =
    authView === 'login'
      ? 'Sign in'
      : authView === 'register'
        ? 'Create account'
        : 'Reset password';

  const description =
    authView === 'login'
      ? 'Sign in to view your account and order history.'
      : authView === 'register'
        ? 'Create an account to save your cart and track orders.'
        : 'Enter your email and we will send reset instructions if an account exists.';

  return (
    <Dialog open={loginDialogOpen} onOpenChange={handleOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {error ? (
            <Alert variant="error" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert variant="success" className="mb-4">
              <AlertDescription>
                {successMessage}
                {devResetUrl ? (
                  <>
                    {' '}
                    <a className="underline" href={devResetUrl}>
                      Dev reset link
                    </a>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {authView === 'login' ? (
            <form className="flex flex-col gap-4" onSubmit={handleLoginSubmit}>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  autoComplete="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input
                  autoComplete="current-password"
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
              </Field>
              <DialogFooter variant="bare">
                <Button loading={loading} type="submit">
                  Sign in
                </Button>
              </DialogFooter>
            </form>
          ) : null}

          {authView === 'register' ? (
            <form className="flex flex-col gap-4" onSubmit={handleRegisterSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>First name</FieldLabel>
                  <Input
                    autoComplete="given-name"
                    required
                    value={form.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Last name</FieldLabel>
                  <Input
                    autoComplete="family-name"
                    required
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  autoComplete="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input
                  autoComplete="new-password"
                  minLength={8}
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Confirm password</FieldLabel>
                <Input
                  autoComplete="new-password"
                  minLength={8}
                  required
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField('confirmPassword', event.target.value)
                  }
                />
              </Field>
              <DialogFooter variant="bare">
                <Button loading={loading} type="submit">
                  Create account
                </Button>
              </DialogFooter>
            </form>
          ) : null}

          {authView === 'forgot' ? (
            <form className="flex flex-col gap-4" onSubmit={handleForgotSubmit}>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  autoComplete="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </Field>
              <DialogFooter variant="bare">
                <Button loading={loading} type="submit">
                  Send reset link
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogPanel>

        <DialogFooter>
          {authView === 'login' ? (
            <div className="flex w-full flex-col gap-2 text-sm">
              <button
                className="text-left text-muted-foreground underline-offset-4 hover:underline"
                type="button"
                onClick={() => {
                  setAuthView('forgot');
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                Forgot password?
              </button>
              <button
                className="text-left text-muted-foreground underline-offset-4 hover:underline"
                type="button"
                onClick={() => {
                  setAuthView('register');
                  setError(null);
                }}
              >
                Need an account? Register
              </button>
            </div>
          ) : null}

          {authView === 'register' ? (
            <button
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              type="button"
              onClick={() => {
                setAuthView('login');
                setError(null);
              }}
            >
              Already have an account? Sign in
            </button>
          ) : null}

          {authView === 'forgot' ? (
            <button
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              type="button"
              onClick={() => {
                setAuthView('login');
                setError(null);
                setSuccessMessage(null);
              }}
            >
              Back to sign in
            </button>
          ) : null}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
