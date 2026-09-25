'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';

import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/format';
import type { MockCheckoutDefaults } from '@/components/checkout/mock-checkout-defaults';

type PayableTotal = {
  centAmount: number;
  currencyCode: string;
};

type ShippingMethodOption = {
  id: string;
  name: string;
  price: PayableTotal;
};

type MockCheckoutFormProps = {
  country: string;
  defaults: MockCheckoutDefaults;
};

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export function MockCheckoutForm({ country, defaults }: MockCheckoutFormProps) {
  const router = useRouter();
  const { syncCartItemCount } = useCart();
  const continueLock = useRef(false);
  const payLock = useRef(false);
  const shippingRequest = useRef(0);
  const [email, setEmail] = useState(defaults.email);
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [streetName, setStreetName] = useState(defaults.streetName);
  const [streetNumber, setStreetNumber] = useState(defaults.streetNumber);
  const [postalCode, setPostalCode] = useState(defaults.postalCode);
  const [city, setCity] = useState(defaults.city);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>(
    [],
  );
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [amountDue, setAmountDue] = useState<PayableTotal | null>(null);
  const [shippingReady, setShippingReady] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isApplyingShipping, setIsApplyingShipping] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  function markAddressDirty() {
    setPrepared(false);
    setShippingMethods([]);
    setShippingMethodId('');
    setAmountDue(null);
    setShippingReady(false);
  }

  async function applyShipping(methodId: string) {
    const requestId = shippingRequest.current + 1;
    shippingRequest.current = requestId;
    setIsApplyingShipping(true);
    setShippingReady(false);
    setError(null);

    try {
      const response = await fetch('/api/checkout/mock-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingMethodId: methodId }),
      });

      if (requestId !== shippingRequest.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to update shipping'));
      }

      const body = (await response.json()) as { total: PayableTotal };
      setAmountDue(body.total);
      setShippingReady(true);
      router.refresh();
    } catch (err) {
      if (requestId !== shippingRequest.current) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to update shipping');
    } finally {
      if (requestId === shippingRequest.current) {
        setIsApplyingShipping(false);
      }
    }
  }

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (continueLock.current || payLock.current) {
      return;
    }

    continueLock.current = true;
    setIsContinuing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/mock-prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          streetName,
          streetNumber,
          postalCode,
          city,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save address'));
      }

      const body = (await response.json()) as {
        shippingMethods: ShippingMethodOption[];
        total: PayableTotal;
      };
      setShippingMethods(body.shippingMethods);
      setShippingMethodId('');
      setPrepared(true);

      if (body.shippingMethods.length === 0) {
        setAmountDue(body.total);
        setShippingReady(true);
      } else {
        setAmountDue(null);
        setShippingReady(false);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      continueLock.current = false;
      setIsContinuing(false);
    }
  }

  async function handlePay() {
    if (payLock.current || continueLock.current || !prepared) {
      return;
    }

    if (shippingMethods.length > 0 && !shippingReady) {
      setError('Select a shipping method');
      return;
    }

    payLock.current = true;
    setIsPaying(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          shippingMethodId ? { shippingMethodId } : {},
        ),
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to place order'));
      }

      const body = (await response.json()) as { orderId: string };
      syncCartItemCount(0);
      router.push(`/order-confirmation?orderId=${body.orderId}`);
    } catch (err) {
      payLock.current = false;
      setIsPaying(false);
      setError(err instanceof Error ? err.message : 'Failed to place order');
    }
  }

  const payDisabled =
    !prepared ||
    isPaying ||
    isContinuing ||
    isApplyingShipping ||
    (shippingMethods.length > 0 && !shippingReady);

  return (
    <div className="flex flex-col gap-4" data-mock-checkout>
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleContinue(event)}>
        <p className="text-sm text-muted-foreground">
          Demo payment. No card is charged. Country follows your selected market.
        </p>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => {
              markAddressDirty();
              setEmail(event.target.value);
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>First name</FieldLabel>
            <Input
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => {
                markAddressDirty();
                setFirstName(event.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Last name</FieldLabel>
            <Input
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => {
                markAddressDirty();
                setLastName(event.target.value);
              }}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field>
            <FieldLabel>Street</FieldLabel>
            <Input
              autoComplete="address-line1"
              required
              value={streetName}
              onChange={(event) => {
                markAddressDirty();
                setStreetName(event.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Number</FieldLabel>
            <Input
              value={streetNumber}
              onChange={(event) => {
                markAddressDirty();
                setStreetNumber(event.target.value);
              }}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Postal code</FieldLabel>
            <Input
              autoComplete="postal-code"
              required
              value={postalCode}
              onChange={(event) => {
                markAddressDirty();
                setPostalCode(event.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel>City</FieldLabel>
            <Input
              autoComplete="address-level2"
              required
              value={city}
              onChange={(event) => {
                markAddressDirty();
                setCity(event.target.value);
              }}
            />
          </Field>
          <Field>
            <FieldLabel>Country</FieldLabel>
            <Input readOnly value={country} />
            <FieldDescription>Set by the market switcher.</FieldDescription>
          </Field>
        </div>
        <Button disabled={isContinuing || isPaying} type="submit">
          {isContinuing ? 'Saving address…' : 'Continue'}
        </Button>
      </form>

      {prepared ? (
        <div className="flex flex-col gap-4">
          {shippingMethods.length > 0 ? (
            <Field>
              <FieldLabel>Shipping method</FieldLabel>
              <select
                aria-label="Shipping method"
                className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-sm"
                required
                value={shippingMethodId}
                onChange={(event) => {
                  const methodId = event.target.value;
                  setShippingMethodId(methodId);
                  if (methodId) {
                    void applyShipping(methodId);
                  } else {
                    setShippingReady(false);
                  }
                }}
              >
                <option value="">Select a shipping method</option>
                {shippingMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name} ({formatPrice(method.price.centAmount, method.price.currencyCode)})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              No shipping methods match this address. You can still place the order.
            </p>
          )}
          <Button disabled={payDisabled} type="button" onClick={() => handlePay()}>
            {isPaying ? 'Contacting payment provider…' : 'Pay now'}
          </Button>
          {amountDue ? (
            <p className="text-sm font-medium">
              Amount due {formatPrice(amountDue.centAmount, amountDue.currencyCode)}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
