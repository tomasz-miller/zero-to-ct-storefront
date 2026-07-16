'use client';

import { Globe2, LoaderCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DismissibleAlert } from '@/components/account/dismissible-alert';
import { useCart } from '@/components/cart/cart-context';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/components/ui/menu';
import type { StorefrontCountry } from '@/lib/commercetools/storefront-context';
import { cn } from '@/lib/utils';

const MARKET_OPTIONS: Record<
  StorefrontCountry,
  { label: string; shortLabel: string; currency: string }
> = {
  DE: { label: 'Germany', shortLabel: 'DE', currency: 'EUR' },
  GB: { label: 'United Kingdom', shortLabel: 'GB', currency: 'GBP' },
  US: { label: 'United States', shortLabel: 'US', currency: 'USD' },
};

const NOTICE_AUTO_DISMISS_MS = 8_000;

type MarketSwitcherProps = {
  country: StorefrontCountry;
  compact?: boolean;
};

async function cartHasItems(
  knownItemCount: number | null,
): Promise<boolean> {
  if (knownItemCount !== null) {
    return knownItemCount > 0;
  }

  try {
    const response = await fetch('/api/cart');
    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as {
      cart: { itemCount: number } | null;
    };

    return (body.cart?.itemCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export function MarketSwitcher({
  country,
  compact = false,
}: MarketSwitcherProps) {
  const router = useRouter();
  const { itemCount, refreshCart, syncCartItemCount } = useCart();
  const [optimisticCountry, setOptimisticCountry] =
    useState<StorefrontCountry | null>(null);
  const [pendingCountry, setPendingCountry] = useState<StorefrontCountry | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (optimisticCountry !== null && country === optimisticCountry) {
    setOptimisticCountry(null);
  }

  const selectedCountry = optimisticCountry ?? country;
  const dismissNotice = useCallback(() => setNotice(null), []);

  async function changeMarket(nextCountry: StorefrontCountry) {
    if (nextCountry === selectedCountry || isPending) {
      return;
    }

    setIsPending(true);
    setNotice(null);
    setOptimisticCountry(nextCountry);

    try {
      const response = await fetch('/api/storefront/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: nextCountry }),
      });

      if (!response.ok) {
        throw new Error('Failed to change storefront market');
      }

      const result = (await response.json()) as {
        country: StorefrontCountry;
        cartRecreated: boolean;
        cartRestored: boolean;
        itemCount: number;
        previousHadItems: boolean;
      };

      setOptimisticCountry(result.country);
      syncCartItemCount(result.itemCount);
      if (
        result.cartRecreated &&
        !result.cartRestored &&
        result.previousHadItems
      ) {
        setNotice(
          'Started a new empty cart for this market. Your previous market cart was saved.',
        );
      }

      await refreshCart();
      router.refresh();
    } catch {
      setOptimisticCountry(null);
      setNotice('We could not change your market. Please try again.');
    } finally {
      setIsPending(false);
      setPendingCountry(null);
    }
  }

  async function requestMarketChange(nextCountry: StorefrontCountry) {
    if (nextCountry === selectedCountry || isPending) {
      return;
    }

    if (await cartHasItems(itemCount)) {
      setPendingCountry(nextCountry);
      setConfirmOpen(true);
      return;
    }

    await changeMarket(nextCountry);
  }

  function cancelMarketChange() {
    setConfirmOpen(false);
    setPendingCountry(null);
  }

  function confirmMarketChange() {
    if (!pendingCountry) {
      return;
    }

    setConfirmOpen(false);
    void changeMarket(pendingCountry);
  }

  const selectedMarket = MARKET_OPTIONS[selectedCountry];
  const pendingMarket = pendingCountry
    ? MARKET_OPTIONS[pendingCountry]
    : null;

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label={`Change market, currently ${selectedMarket.label}`}
              className="gap-1.5"
              disabled={isPending}
              size="sm"
              variant="ghost"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin opacity-80" aria-hidden />
              ) : (
                <Globe2 className="size-4 shrink-0 opacity-80" aria-hidden />
              )}
              <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
                {selectedMarket.shortLabel} · {selectedMarket.currency}
              </span>
            </Button>
          }
        />
        <MenuPopup align="end">
          <MenuRadioGroup value={selectedCountry}>
            {(Object.entries(MARKET_OPTIONS) as [
              StorefrontCountry,
              (typeof MARKET_OPTIONS)[StorefrontCountry],
            ][]).map(([marketCountry, market]) => (
              <MenuRadioItem
                key={marketCountry}
                value={marketCountry}
                onClick={() => void requestMarketChange(marketCountry)}
              >
                {market.label} · {market.currency}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelMarketChange();
          }
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch store?</AlertDialogTitle>
            <AlertDialogDescription>
              Your cart for {MARKET_OPTIONS[selectedCountry].label} will be
              saved. You can return to it later by switching back
              {pendingMarket ? ` from ${pendingMarket.label}` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={<Button type="button" variant="ghost" />}
              onClick={cancelMarketChange}
            >
              No
            </AlertDialogClose>
            <Button type="button" onClick={confirmMarketChange}>
              Yes
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      {notice ? (
        <DismissibleAlert
          autoDismissMs={NOTICE_AUTO_DISMISS_MS}
          className="fixed top-20 left-1/2 z-60 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 shadow-lg"
          message={notice}
          variant="warning"
          onDismiss={dismissNotice}
        />
      ) : null}
    </>
  );
}
