'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import type { StorefrontCart } from '@/lib/commercetools/cart-mappers';

type CartDiscountFormProps = {
  cart: StorefrontCart;
};

export function CartDiscountForm({ cart }: CartDiscountFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function applyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/cart/discount-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to apply discount code');
      }

      setCode('');
      setSuccess('Discount code applied.');
      router.refresh();
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : 'Could not apply discount code.',
      );
    } finally {
      setPending(false);
    }
  }

  async function removeCode(discountCodeId: string) {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/cart/discount-code', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountCodeId }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to remove discount code');
      }

      setSuccess('Discount code removed.');
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Could not remove discount code.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-col gap-2" onSubmit={applyCode}>
        <label className="text-sm font-medium" htmlFor="discount-code">
          Discount code
        </label>
        <InputGroup>
          <InputGroupInput
            id="discount-code"
            name="discount-code"
            placeholder="Enter code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={pending}
            autoComplete="off"
          />
          <InputGroupAddon align="inline-end">
            <Button type="submit" size="sm" disabled={pending || !code.trim()}>
              {pending ? <Spinner className="size-4" /> : 'Apply'}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </form>

      {cart.discountCodes.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {cart.discountCodes.map((discountCode) => (
            <li
              key={discountCode.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">{discountCode.code}</span>
                {discountCode.name ? (
                  <span className="text-muted-foreground">{discountCode.name}</span>
                ) : null}
                {discountCode.state !== 'MatchesCart' ? (
                  <span className="text-destructive">
                    This code no longer applies to your cart.
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => removeCode(discountCode.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
