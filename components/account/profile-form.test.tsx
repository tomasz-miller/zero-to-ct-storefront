import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from './profile-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/components/auth/auth-context', () => ({
  useAuth: () => ({ refreshSession: vi.fn() }),
}));

const customer = {
  id: 'cust-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: 'Jane Doe',
  createdAt: '2026-01-01T00:00:00.000Z',
  addresses: [],
};

describe('ProfileForm', () => {
  it('renders profile fields and submits updates', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ customer: { ...customer, firstName: 'Janet' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ProfileForm customer={customer} />);

    expect(screen.getByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');

    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Janet');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer/profile',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );
  });
});
