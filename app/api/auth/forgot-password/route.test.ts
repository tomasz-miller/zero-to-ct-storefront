/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRequestPasswordReset, mockDeliveryConfigured, mockDevLink } =
  vi.hoisted(() => ({
    mockRequestPasswordReset: vi.fn(),
    mockDeliveryConfigured: vi.fn(),
    mockDevLink: vi.fn(),
  }));

vi.mock('@/lib/commercetools/customer-auth', () => ({
  CustomerAuthError: class CustomerAuthError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  requestPasswordReset: mockRequestPasswordReset,
}));

vi.mock('@/lib/commercetools/password-reset-delivery', () => ({
  isPasswordResetDeliveryConfigured: mockDeliveryConfigured,
  isPasswordResetDevLinkEnabled: mockDevLink,
}));

import { POST } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password', () => {
  // Existing tests keep reaching commercetools: delivery on, dev link off unless a test says otherwise.
  beforeEach(() => {
    mockDeliveryConfigured.mockReset().mockReturnValue(true);
    mockDevLink.mockReset().mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockRequestPasswordReset.mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(createRequest({ email: 'not-an-email' }));

    expect(response.status).toBe(400);
  });

  it('returns generic success message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ tokenValue: 'tok-1' });

    const response = await POST(createRequest({ email: 'jane@example.com' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toMatch(/if an account exists/i);
  });

  it('does not reveal missing accounts', async () => {
    const { CustomerAuthError } = await import('@/lib/commercetools/customer-auth');
    mockRequestPasswordReset.mockRejectedValue(
      new CustomerAuthError('ResourceNotFound', 'Not found', 404),
    );

    const response = await POST(createRequest({ email: 'missing@example.com' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toMatch(/if an account exists/i);
  });

  it('does not mint a token when no delivery is configured', async () => {
    mockDeliveryConfigured.mockReturnValue(false);
    const res = await POST(createRequest({ email: 'jane@example.com' }));
    expect(res.status).toBe(200);
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect((await res.json()).devResetUrl).toBeUndefined();
  });

  it('returns devResetUrl only when the dev link is enabled', async () => {
    mockDeliveryConfigured.mockReturnValue(true);
    mockDevLink.mockReturnValue(true);
    mockRequestPasswordReset.mockResolvedValue({ tokenValue: 'tok 1' });
    expect(
      (await (await POST(createRequest({ email: 'jane@example.com' }))).json())
        .devResetUrl,
    ).toBe('/reset-password?token=tok%201');
  });
});
