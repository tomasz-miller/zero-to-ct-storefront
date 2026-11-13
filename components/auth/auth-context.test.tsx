import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './auth-context';

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: mockRefresh, replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

let logoutResponse: Response;
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') {
        return Response.json({
          customer: { id: 'cust-1', email: 'jane@example.com', displayName: 'Jane' },
        });
      }
      if (url === '/api/auth/logout') return logoutResponse;
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const { customer, signOut } = useAuth();
  const [result, setResult] = useState('');
  return (
    <div data-testid="probe">
      <span>{customer?.id ?? 'none'}</span>
      <button
        type="button"
        data-result={result}
        onClick={async () => setResult(String(await signOut()))}
      >
        sign out
      </button>
    </div>
  );
}

it('signOut returns false and keeps the customer when logout responds 500', async () => {
  logoutResponse = new Response(null, { status: 500 });
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText('cust-1');
  await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'sign out' })).toHaveAttribute(
      'data-result',
      'false',
    ),
  );
  expect(screen.getByText('cust-1')).toBeInTheDocument();
  expect(mockRefresh).not.toHaveBeenCalled();
});

it('signOut returns true, clears the customer and refreshes the router when logout succeeds', async () => {
  logoutResponse = new Response(null, { status: 200 });
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText('cust-1');
  await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
  expect(await screen.findByText('none')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'sign out' })).toHaveAttribute(
    'data-result',
    'true',
  );
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});
