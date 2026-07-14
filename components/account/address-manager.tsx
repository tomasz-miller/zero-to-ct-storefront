'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DismissibleAlert } from '@/components/account/dismissible-alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StorefrontCustomerAddress } from '@/lib/commercetools/customer-mappers';
import { cn } from '@/lib/utils';

type AddressFormState = {
  firstName: string;
  lastName: string;
  streetName: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

const emptyAddressForm = (): AddressFormState => ({
  firstName: '',
  lastName: '',
  streetName: '',
  streetNumber: '',
  postalCode: '',
  city: '',
  country: 'DE',
  isDefaultShipping: false,
  isDefaultBilling: false,
});

function toFormState(address: StorefrontCustomerAddress): AddressFormState {
  return {
    firstName: address.firstName ?? '',
    lastName: address.lastName ?? '',
    streetName: address.streetName,
    streetNumber: address.streetNumber ?? '',
    postalCode: address.postalCode,
    city: address.city,
    country: address.country,
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  };
}

function addressLabel(address: StorefrontCustomerAddress): string | null {
  if (address.isDefaultBilling && address.isDefaultShipping) {
    return 'Default billing & shipping';
  }
  if (address.isDefaultBilling) {
    return 'Default billing';
  }
  if (address.isDefaultShipping) {
    return 'Default shipping';
  }
  return null;
}

type AddressManagerProps = {
  addresses: StorefrontCustomerAddress[];
  className?: string;
};

export function AddressManager({ addresses, className }: AddressManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(addresses);
  const [form, setForm] = useState<AddressFormState>(emptyAddressForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function closeDialog() {
    setDialogOpen(false);
    setForm(emptyAddressForm());
    setEditingId(null);
    setDialogError(null);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      closeDialog();
      return;
    }
    setDialogOpen(true);
  }

  function startAdd() {
    setForm(emptyAddressForm());
    setEditingId(null);
    setDialogError(null);
    setListError(null);
    setSuccess(null);
    setDialogOpen(true);
  }

  function startEdit(address: StorefrontCustomerAddress) {
    setForm(toFormState(address));
    setEditingId(address.id);
    setDialogError(null);
    setListError(null);
    setSuccess(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setDialogError(null);
    setListError(null);
    setSuccess(null);

    const payload = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      streetName: form.streetName,
      streetNumber: form.streetNumber || undefined,
      postalCode: form.postalCode,
      city: form.city,
      country: form.country,
      isDefaultShipping: form.isDefaultShipping,
      isDefaultBilling: form.isDefaultBilling,
    };

    try {
      const response = await fetch(
        editingId
          ? `/api/customer/addresses/${encodeURIComponent(editingId)}`
          : '/api/customer/addresses',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as {
        error?: string;
        customer?: { addresses: StorefrontCustomerAddress[] };
      };

      if (!response.ok) {
        setDialogError(body.error ?? 'Failed to save address');
        return;
      }

      if (body.customer?.addresses) {
        setItems(body.customer.addresses);
      }

      setSuccess(editingId ? 'Address updated.' : 'Address added.');
      closeDialog();
      router.refresh();
    } catch {
      setDialogError('Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(addressId: string) {
    setLoading(true);
    setListError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/customer/addresses/${encodeURIComponent(addressId)}`,
        { method: 'DELETE' },
      );

      const body = (await response.json()) as {
        error?: string;
        customer?: { addresses: StorefrontCustomerAddress[] };
      };

      if (!response.ok) {
        setListError(body.error ?? 'Failed to delete address');
        return;
      }

      if (body.customer?.addresses) {
        setItems(body.customer.addresses);
      }

      if (editingId === addressId) {
        closeDialog();
      }

      setSuccess('Address removed.');
      router.refresh();
    } catch {
      setListError('Failed to delete address. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const dialogTitle = editingId ? 'Edit address' : 'Add address';
  const dialogDescription = editingId
    ? 'Update your shipping or billing address details.'
    : 'Enter a new shipping or billing address for your account.';

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Addresses</CardTitle>
            <CardDescription>Manage shipping and billing addresses.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={startAdd}>
            Add address
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {listError ? (
            <DismissibleAlert
              message={listError}
              variant="error"
              onDismiss={() => setListError(null)}
            />
          ) : null}

          {success ? (
            <DismissibleAlert
              autoDismissMs={5000}
              className="mb-0"
              message={success}
              variant="success"
              onDismiss={() => setSuccess(null)}
            />
          ) : null}

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          ) : null}

          {items.map((address) => {
            const label = addressLabel(address);

            return (
              <div
                key={address.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-sm">
                  {label ? (
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                  ) : null}
                  <p>{address.formatted}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(address)}
                  >
                    Edit
                  </Button>
                  <Button
                    disabled={loading}
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(address.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <form className="contents" onSubmit={handleSubmit}>
            <DialogPanel>
              {dialogError ? (
                <DismissibleAlert
                  className="mb-4"
                  message={dialogError}
                  variant="error"
                  onDismiss={() => setDialogError(null)}
                />
              ) : null}

              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>First name</FieldLabel>
                    <Input
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Last name</FieldLabel>
                    <Input
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <Field>
                    <FieldLabel>Street</FieldLabel>
                    <Input
                      autoComplete="address-line1"
                      required
                      value={form.streetName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          streetName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Number</FieldLabel>
                    <Input
                      value={form.streetNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          streetNumber: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel>Postal code</FieldLabel>
                    <Input
                      autoComplete="postal-code"
                      required
                      value={form.postalCode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          postalCode: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>City</FieldLabel>
                    <Input
                      autoComplete="address-level2"
                      required
                      value={form.city}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Country</FieldLabel>
                    <Input
                      autoComplete="country"
                      maxLength={2}
                      required
                      value={form.country}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          country: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      checked={form.isDefaultShipping}
                      className="size-4 rounded border"
                      type="checkbox"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isDefaultShipping: event.target.checked,
                        }))
                      }
                    />
                    Default shipping address
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={form.isDefaultBilling}
                      className="size-4 rounded border"
                      type="checkbox"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          isDefaultBilling: event.target.checked,
                        }))
                      }
                    />
                    Default billing address
                  </label>
                </div>
              </div>
            </DialogPanel>

            <DialogFooter variant="bare">
              <Button
                disabled={loading}
                type="button"
                variant="ghost"
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button loading={loading} type="submit">
                {editingId ? 'Save address' : 'Add address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}
