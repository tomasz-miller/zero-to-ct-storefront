'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AuthCustomer = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
};

export type AuthView = 'login' | 'register' | 'forgot';

type AuthContextValue = {
  customer: AuthCustomer | null;
  isLoading: boolean;
  authView: AuthView;
  loginDialogOpen: boolean;
  refreshSession: () => Promise<void>;
  openLoginDialog: (view?: AuthView) => void;
  closeLoginDialog: () => void;
  setAuthView: (view: AuthView) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenLogin = searchParams.get('login') === '1';
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginDialogOpen, setLoginDialogOpen] = useState(shouldOpenLogin);
  const [authView, setAuthView] = useState<AuthView>('login');

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        setCustomer(null);
        return;
      }

      const body = (await response.json()) as { customer: AuthCustomer | null };
      setCustomer(body.customer);
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/session');
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setCustomer(null);
          return;
        }

        const body = (await response.json()) as { customer: AuthCustomer | null };
        setCustomer(body.customer);
      } catch {
        if (!cancelled) {
          setCustomer(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (shouldOpenLogin) {
      router.replace('/', { scroll: false });
    }
  }, [router, shouldOpenLogin]);

  const openLoginDialog = useCallback((view: AuthView = 'login') => {
    setAuthView(view);
    setLoginDialogOpen(true);
  }, []);

  const closeLoginDialog = useCallback(() => {
    setLoginDialogOpen(false);
    setAuthView('login');
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCustomer(null);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      customer,
      isLoading,
      authView,
      loginDialogOpen,
      refreshSession,
      openLoginDialog,
      closeLoginDialog,
      setAuthView,
      signOut,
    }),
    [
      customer,
      isLoading,
      authView,
      loginDialogOpen,
      refreshSession,
      openLoginDialog,
      closeLoginDialog,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
