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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StorefrontCustomer } from '@/lib/commercetools/customer-mappers';

type ProfileFormProps = {
  customer: StorefrontCustomer;
};

export function ProfileForm({ customer }: ProfileFormProps) {
  const router = useRouter();
  const { refreshSession } = useAuth();

  const [firstName, setFirstName] = useState(customer.firstName ?? '');
  const [lastName, setLastName] = useState(customer.lastName ?? '');
  const [email, setEmail] = useState(customer.email);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });

      const body = (await response.json()) as {
        error?: string;
        customer?: StorefrontCustomer;
      };

      if (!response.ok) {
        setError(body.error ?? 'Failed to update profile');
        return;
      }

      const emailChanged = email.trim().toLowerCase() !== customer.email.toLowerCase();
      setSuccess(
        emailChanged
          ? 'Profile updated. Your email verification status was reset — you may need to verify again when email delivery is enabled.'
          : 'Profile updated.',
      );

      await refreshSession();
      router.refresh();
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your account details.</CardDescription>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>First name</FieldLabel>
              <Input
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Last name</FieldLabel>
              <Input
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FieldDescription>
              Email addresses must be unique in this store.
            </FieldDescription>
          </Field>

          <Button className="w-fit" loading={loading} type="submit">
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
