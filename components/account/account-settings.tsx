'use client';

import { AddressManager } from '@/components/account/address-manager';
import { PasswordForm } from '@/components/account/password-form';
import { ProfileForm } from '@/components/account/profile-form';
import type { StorefrontCustomer } from '@/lib/commercetools/customer-mappers';

type AccountSettingsProps = {
  customer: StorefrontCustomer;
};

export function AccountSettings({ customer }: AccountSettingsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2 xl:items-start 2xl:grid-cols-3">
      <ProfileForm customer={customer} />
      <AddressManager
        addresses={customer.addresses}
        className="xl:row-span-2 2xl:row-span-1"
      />
      <PasswordForm />
    </div>
  );
}
