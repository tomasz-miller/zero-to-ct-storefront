'use client';

import Link from 'next/link';

import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartTriggerButton } from '@/components/cart/cart-trigger-button';

export function CartNavLink({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className="md:hidden">
        <CartDrawer compact={compact} />
      </div>
      <div className="hidden md:block">
        <CartTriggerButton compact={compact} render={<Link href="/cart" />} />
      </div>
    </>
  );
}
