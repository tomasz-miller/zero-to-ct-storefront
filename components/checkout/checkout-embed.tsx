'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkoutFlow, close } from '@commercetools/checkout-browser-sdk';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { resolveCheckoutErrorMessage } from '@/lib/checkout-error-messages';
import { resolveCheckoutSdkStyles } from '@/lib/checkout-sdk-styles';

function handleCheckoutSdkMessage(
  code: string | undefined,
  setError: (message: string) => void,
): void {
  if (
    code === 'no_payment_integrations' ||
    code === 'error_loading_all_payment_integrations'
  ) {
    setError(resolveCheckoutErrorMessage(code));
  }
}

type CheckoutEmbedProps = {
  projectKey: string;
  region: string;
  locale: string;
  canUseDefaultAddress?: boolean;
};

export function CheckoutEmbed({
  projectKey,
  region,
  locale,
  canUseDefaultAddress = false,
}: CheckoutEmbedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('paymentReference') ?? undefined;
  const { refreshCart, syncCartItemCount } = useCart();
  const checkoutCompletedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingDefaultAddress, setIsApplyingDefaultAddress] =
    useState(false);
  const [checkoutMountKey, setCheckoutMountKey] = useState(0);

  const startCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch('/api/checkout/session', {
      method: 'POST',
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? 'Failed to start checkout');
    }

    const { sessionId } = (await response.json()) as { sessionId: string };

    checkoutFlow({
      projectKey,
      region,
      sessionId,
      locale,
      logError: true,
      styles: resolveCheckoutSdkStyles(),
      skipPaymentSuccessPage: true,
      paymentReference,
      onInfo: (message) => {
        if (message.code === 'checkout_completed') {
          if (checkoutCompletedRef.current) {
            return;
          }

          checkoutCompletedRef.current = true;
          const payload = message.payload as {
            order?: { id?: string };
          };
          const orderId = payload.order?.id;
          void (async () => {
            try {
              const response = await fetch('/api/cart/complete', {
                method: 'POST',
              });

              if (response.ok) {
                syncCartItemCount(0);
              } else {
                await refreshCart();
              }
            } catch {
              await refreshCart();
            }

            router.push(
              orderId
                ? `/order-confirmation?orderId=${orderId}`
                : '/order-confirmation',
            );
          })();
          return;
        }

        handleCheckoutSdkMessage(message.code, setError);
      },
      onWarn: (message) => {
        handleCheckoutSdkMessage(message.code, setError);
      },
      onError: (checkoutError) => {
        setError(resolveCheckoutErrorMessage(checkoutError.code));
      },
    });

    setIsLoading(false);
  }, [
    locale,
    paymentReference,
    projectKey,
    refreshCart,
    region,
    router,
    syncCartItemCount,
  ]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await startCheckout();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to start checkout',
          );
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startCheckout, checkoutMountKey]);

  async function handleUseDefaultAddress() {
    if (isApplyingDefaultAddress) {
      return;
    }

    setIsApplyingDefaultAddress(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/checkout/default-address', {
        method: 'POST',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'Failed to apply default address');
      }

      close();
      checkoutCompletedRef.current = false;
      setCheckoutMountKey((current) => current + 1);
      setSuccessMessage('Default address applied.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to apply default address',
      );
    } finally {
      setIsApplyingDefaultAddress(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canUseDefaultAddress ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Use your saved default shipping or billing address in checkout.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || isApplyingDefaultAddress}
            onClick={() => void handleUseDefaultAddress()}
          >
            {isApplyingDefaultAddress
              ? 'Applying default address…'
              : 'Use my default address'}
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-muted-foreground">{successMessage}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div
        key={checkoutMountKey}
        data-ctc
        className="min-h-[480px] rounded-xl border"
      />
    </div>
  );
}
