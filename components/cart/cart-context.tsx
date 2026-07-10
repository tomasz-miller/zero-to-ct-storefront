'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type CartContextValue = {
  itemCount: number | null;
  refreshCart: () => Promise<void>;
  syncCartItemCount: (itemCount: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState<number | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as {
        cart: { itemCount: number } | null;
      };

      setItemCount(body.cart?.itemCount ?? 0);
    } catch {
      setItemCount(0);
    }
  }, []);

  const syncCartItemCount = useCallback((count: number) => {
    setItemCount(count);
  }, []);

  const value = useMemo(
    () => ({ itemCount, refreshCart, syncCartItemCount }),
    [itemCount, refreshCart, syncCartItemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}
