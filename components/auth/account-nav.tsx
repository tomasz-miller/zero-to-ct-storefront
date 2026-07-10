'use client';

import Link from 'next/link';
import { ChevronDown, LogOut, User } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-context';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';

export function AccountNav({ compact = false }: { compact?: boolean }) {
  const { customer, isLoading, openLoginDialog, signOut } = useAuth();
  const { refreshCart } = useCart();

  if (isLoading) {
    return (
      <Button
        aria-hidden
        className="pointer-events-none opacity-0"
        size="sm"
        tabIndex={-1}
        variant="ghost"
      >
        Account
      </Button>
    );
  }

  if (!customer) {
    return (
      <Button
        className="gap-1.5"
        size="sm"
        variant="ghost"
        onClick={() => openLoginDialog('login')}
      >
        <User className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>Sign in</span>
      </Button>
    );
  }

  const label = customer.displayName || customer.email;

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button className="max-w-40 gap-1.5" size="sm" variant="ghost">
            <User className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className={cn('truncate', compact ? 'sr-only' : 'hidden sm:inline')}>
              {label}
            </span>
            {!compact ? (
              <ChevronDown className="hidden size-4 opacity-60 sm:inline" aria-hidden />
            ) : null}
          </Button>
        }
      />
      <MenuPopup align="end">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <p className="truncate font-medium text-foreground">{label}</p>
          <p className="truncate">{customer.email}</p>
        </div>
        <MenuSeparator />
        <MenuLinkItem render={<Link href="/account" />}>Account</MenuLinkItem>
        <MenuSeparator />
        <MenuItem
          className="text-destructive-foreground"
          onClick={() => {
            void (async () => {
              await signOut();
              await refreshCart();
            })();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
