import 'server-only';

import { getClientCredentialsAccessToken } from './access-token';
import { commercetoolsEnv } from './env';
import { resolveCheckoutApplicationKey } from './storefront-context';

type SessionResponse = {
  id: string;
};

export async function createCheckoutSession(
  cartId: string,
  country: string,
): Promise<string> {
  const applicationKey = resolveCheckoutApplicationKey(country);
  const accessToken = await getClientCredentialsAccessToken();

  const response = await fetch(
    `${commercetoolsEnv.sessionUrl}/${commercetoolsEnv.projectKey}/sessions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cart: {
          cartRef: {
            id: cartId,
          },
        },
        metadata: {
          applicationKey,
        },
      }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to create checkout session (${response.status}): ${raw || 'empty response'}`,
    );
  }

  let body: SessionResponse;
  try {
    body = JSON.parse(raw) as SessionResponse;
  } catch {
    throw new Error('Checkout session response was not valid JSON');
  }

  if (!body.id) {
    throw new Error('Checkout session response missing id');
  }

  return body.id;
}
