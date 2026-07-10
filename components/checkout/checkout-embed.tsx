'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { checkoutFlow } from '@commercetools/checkout-browser-sdk';

type CheckoutEmbedProps = {
  projectKey: string;
  region: string;
  locale: string;
};

export function CheckoutEmbed({
  projectKey,
  region,
  locale,
}: CheckoutEmbedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
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

        if (cancelled) {
          return;
        }

        checkoutFlow({
          projectKey,
          region,
          sessionId,
          locale,
          logError: true,
          skipPaymentSuccessPage: true,
          paymentReference: searchParams.get('paymentReference') ?? undefined,
          onInfo: (message) => {
            if (message.code === 'checkout_completed') {
              const payload = message.payload as {
                order?: { id?: string };
              };
              const orderId = payload.order?.id;
              router.push(
                orderId
                  ? `/order-confirmation?orderId=${orderId}`
                  : '/order-confirmation',
              );
            }
          },
          onError: (checkoutError) => {
            setError(checkoutError.code ?? 'Checkout failed');
          },
        });

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to start checkout',
          );
          setIsLoading(false);
        }
      }
    }

    void startCheckout();

    return () => {
      cancelled = true;
    };
  }, [locale, projectKey, region, router, searchParams]);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div ref={containerRef} data-ctc className="min-h-[480px] rounded-xl border" />
    </div>
  );
}
