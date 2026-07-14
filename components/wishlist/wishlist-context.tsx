'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type WishlistContextValue = {
  itemCount: number | null;
  skus: Set<string>;
  refreshWishlist: () => Promise<void>;
  syncWishlist: (itemCount: number, skus: string[]) => void;
  isInWishlist: (sku: string) => boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [skus, setSkus] = useState<Set<string>>(new Set());

  const syncWishlist = useCallback((count: number, nextSkus: string[]) => {
    setItemCount(count);
    setSkus(new Set(nextSkus));
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const response = await fetch('/api/wishlist');
      if (!response.ok) {
        syncWishlist(0, []);
        return;
      }

      const body = (await response.json()) as {
        wishlist: { itemCount: number; skus: string[] } | null;
      };

      syncWishlist(body.wishlist?.itemCount ?? 0, body.wishlist?.skus ?? []);
    } catch {
      syncWishlist(0, []);
    }
  }, [syncWishlist]);

  const isInWishlist = useCallback(
    (sku: string) => {
      return skus.has(sku);
    },
    [skus],
  );

  const value = useMemo(
    () => ({
      itemCount,
      skus,
      refreshWishlist,
      syncWishlist,
      isInWishlist,
    }),
    [itemCount, skus, refreshWishlist, syncWishlist, isInWishlist],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }

  return context;
}
