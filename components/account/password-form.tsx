'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/auth-context';
import { DismissibleAlert } from '@/components/account/dismissible-alert';
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

export function PasswordForm() {
  const router = useRouter();
  const { openLoginDialog, refreshSession } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/customer/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        message?: string;
        requiresSignIn?: boolean;
      };

      if (!response.ok) {
        setError(body.error ?? 'Failed to change password');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(body.message ?? 'Password updated.');

      await refreshSession();
      router.refresh();

      if (body.requiresSignIn) {
        openLoginDialog('login');
      }
    } catch {
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <DismissibleAlert
            className="mb-4"
            message={error}
            variant="error"
            onDismiss={() => setError(null)}
          />
        ) : null}

        {success ? (
          <DismissibleAlert
            autoDismissMs={5000}
            className="mb-4"
            message={success}
            variant="success"
            onDismiss={() => setSuccess(null)}
          />
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel>Current password</FieldLabel>
            <Input
              autoComplete="current-password"
              required
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>New password</FieldLabel>
            <Input
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Confirm new password</FieldLabel>
            <Input
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>

          <Button className="w-fit" loading={loading} type="submit">
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
