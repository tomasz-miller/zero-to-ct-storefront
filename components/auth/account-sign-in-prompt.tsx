'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/auth/auth-context';

export function AccountSignInPrompt() {
  const router = useRouter();
  const { openLoginDialog } = useAuth();

  useEffect(() => {
    openLoginDialog();
    router.replace('/');
  }, [openLoginDialog, router]);

  return null;
}
