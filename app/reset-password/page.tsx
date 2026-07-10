'use client';

import { Suspense } from 'react';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Spinner } from '@/components/ui/spinner';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-3xl justify-center px-6 py-10">
          <Spinner />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
