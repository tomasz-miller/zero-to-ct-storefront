'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/components/auth/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openLoginDialog } = useAuth();
  const token = searchParams.get('token') ?? '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: formData.get('newPassword'),
        }),
      });

      const body = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setError(body.error ?? 'Password reset failed');
        return;
      }

      setSuccess(body.message ?? 'Password updated. You can sign in with your new password.');
    } catch {
      setError('Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New password</CardTitle>
          <CardDescription>
            {token
              ? 'Enter a new password with at least 8 characters.'
              : 'This reset link is missing a token. Request a new reset email.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Open the sign-in dialog and use &quot;Forgot password?&quot; to request a
                new link.
              </p>
              <Button
                size="sm"
                className="w-fit"
                onClick={() => {
                  openLoginDialog();
                  router.push('/');
                }}
              >
                Go to sign in
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error ? (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {success ? (
                <Alert variant="success">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel>New password</FieldLabel>
                <Input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={loading}>
                  Update password
                </Button>
                {success ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      openLoginDialog();
                      router.push('/');
                    }}
                  >
                    Sign in
                  </Button>
                ) : (
                  <Button variant="ghost" render={<Link href="/" />}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
