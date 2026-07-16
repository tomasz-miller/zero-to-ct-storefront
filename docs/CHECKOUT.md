# Checkout & Stripe configuration

How to wire **commercetools Checkout** with the **Stripe payment connector** for this project (`zero-to-ct-storefront`).

> **Region:** EU GCP (`europe-west1.gcp`) unless noted otherwise.

---

## Architecture overview

Checkout involves **two separate configurations** that must not be mixed up:

| Layer | Where configured | Credentials live |
|-------|------------------|------------------|
| **Storefront BFF** | `.env.local` in this repo | API client for cart, orders, checkout sessions |
| **Stripe connector** | CT Connect (organization) | Dedicated API client — **not** the storefront client |

The Next.js app never talks to Stripe directly. The BFF creates Checkout sessions; the **Stripe Connect app** (processor + enabler) handles Payment Intents and webhooks.

```
Browser → BFF (/api/checkout/*) → Checkout Session API
                ↓
Checkout UI (Browser SDK) → Stripe connector (Connect) → Stripe API
```

When Checkout emits `checkout_completed`, the Browser SDK calls
`POST /api/cart/complete`. The BFF clears the `ct_guest_cart` cookie and the
client cart badge is reset before redirecting to `/order-confirmation`.

### Browser SDK mode decision

This storefront uses `checkoutFlow`, not `paymentFlow`. Checkout owns address
collection and shipping-method selection, while the storefront owns the page
layout and order summary around the inline `data-ctc` container.

Use `paymentFlow` only after moving address and shipping collection into the
storefront and persisting those values on the Cart before creating a Checkout
Session.

### Saved Customer addresses

`Customer.addresses` from `/account` are not visible to embedded Checkout by
themselves. Complete Checkout reads shipping, billing, and customer email from
the active Cart when the Checkout Session is created.

For signed-in customers with a default shipping or billing address, the
storefront exposes **Use my default address** above the embedded widget. The
button calls `POST /api/checkout/default-address`, which copies the available
default addresses and customer email onto the Cart, closes the current Checkout
widget, creates a fresh Checkout Session, and restarts `checkoutFlow`.

Do not manipulate Checkout DOM fields directly. Prefill must go through Cart
update actions (`setShippingAddress`, `setBillingAddress`, `setCustomerEmail`).

Official references:

- [Set up Checkout](https://docs.commercetools.com/learning-implement-checkout/implement-commercetools-checkout/set-up-checkout.md)
- [Stripe checkout connector](https://github.com/stripe/stripe-commercetools-checkout-app)
- [Checkout scopes](https://docs.commercetools.com/checkout/scopes.md)

---

## Merchant Center — one-time Checkout setup

1. **Checkout → Overview → Get started** — confirm permissions and subscription (once per project).
2. **Settings → Developer settings → API clients** — create the connector client (see below).
3. **Connect → Install** `stripe-commercetools-checkout-app` (or marketplace equivalent).
4. **Checkout → Applications** — create or edit an application; add a **Payment Integration** pointing at the deployed Stripe connector.

Payment Integrations are **inactive by default** — toggle **Status** to active after saving.

---

## API clients — three roles

Use **separate** API clients. Scopes are **immutable** after creation; to change scopes, create a new client.

### 1. Storefront BFF (this repo)

Used by `lib/commercetools/*` for guest cart, product discovery, and (later) checkout session creation.

Typical scopes: `manage_my_orders`, `create_anonymous_token`, `view_published_products`, etc.  
See `.env.example` and [TECH_STACK.md](./TECH_STACK.md).

**Do not** reuse this client for the Stripe connector.

### 2. Stripe Checkout Connector (Connect)

Dedicated client named e.g. `Stripe Checkout Connector`. Credentials go into Connect deployment env vars (`CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, …).

Validated scopes for this project (working configuration as of 2026-07-09):

```
view_types:{projectKey}
manage_payments:{projectKey}
introspect_oauth_tokens:{projectKey}
manage_orders:{projectKey}
manage_types:{projectKey}
manage_payment_methods:{projectKey}
view_payments:{projectKey}
manage_recurring_payment_jobs:{projectKey}
view_orders:{projectKey}
view_sessions:{projectKey}
manage_checkout_payment_intents:{projectKey}
view_api_clients:{projectKey}
```

Replace `{projectKey}` with `zero-to-ct-storefront`.

#### Scope pitfalls

| MC checkbox | OAuth scope | Notes |
|-------------|-------------|-------|
| **Recurring orders** | `manage_recurring_orders` | Schedules repeat **orders** — **not** the same as recurring payment jobs |
| **Payment methods** | `manage_payment_methods` | Separate section from **Payments** — required by Stripe connector |
| *(not in MC UI)* | `manage_recurring_payment_jobs` | Required for Payment Integration validation; create client via **API Clients API** if missing from MC |

`manage_recurring_payment_jobs` is required by the [Stripe processor README](https://github.com/stripe/stripe-commercetools-checkout-app/blob/main/processor/README.md#running-application) but is **not** listed on the public [HTTP API Scopes](https://docs.commercetools.com/api/scopes) page yet. If the Merchant Center scope picker does not show it, create the client with the [API Clients API](https://docs.commercetools.com/api/projects/api-clients.md) and a client that has `manage_api_clients`.

Example (replace placeholders; use an admin token from a client with `manage_api_clients`):

```bash
curl -X POST "https://api.europe-west1.gcp.commercetools.com/zero-to-ct-storefront/clients" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stripe Checkout Connector",
    "scopes": [
      "view_types:zero-to-ct-storefront",
      "manage_payments:zero-to-ct-storefront",
      "introspect_oauth_tokens:zero-to-ct-storefront",
      "manage_orders:zero-to-ct-storefront",
      "manage_types:zero-to-ct-storefront",
      "manage_payment_methods:zero-to-ct-storefront",
      "view_payments:zero-to-ct-storefront",
      "manage_recurring_payment_jobs:zero-to-ct-storefront",
      "view_orders:zero-to-ct-storefront",
      "view_sessions:zero-to-ct-storefront",
      "manage_checkout_payment_intents:zero-to-ct-storefront",
      "view_api_clients:zero-to-ct-storefront"
    ]
  }'
```

Save `id`, `secret`, and `scope` from the response **once** — the secret is not shown again.

### 3. Admin / bootstrap (optional)

A client with `manage_api_clients` (and optionally `manage_project`) for creating connector clients via API. Keep out of the storefront and Connect runtime.

---

## CT Connect — Stripe connector env vars

Configure during Connect install or redeploy. Values below are for **EU GCP**.

### commercetools (required)

| Variable | Example value |
|----------|---------------|
| `CTP_PROJECT_KEY` | `zero-to-ct-storefront` |
| `CTP_CLIENT_ID` | From **Stripe Checkout Connector** API client |
| `CTP_CLIENT_SECRET` | From same client (shown once at creation) |
| `CTP_AUTH_URL` | `https://auth.europe-west1.gcp.commercetools.com` |
| `CTP_API_URL` | `https://api.europe-west1.gcp.commercetools.com` |
| `CTP_SESSION_URL` | `https://session.europe-west1.gcp.commercetools.com` |
| `CTP_JWKS_URL` | `https://mc-api.europe-west1.gcp.commercetools.com/.well-known/jwks.json` |
| `CTP_JWT_ISSUER` | `https://mc-api.europe-west1.gcp.commercetools.com` |

### Stripe (required)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` — used by enabler |
| `STRIPE_WEBHOOK_ID` | `we_…` from [Stripe Workbench → Webhooks](https://dashboard.stripe.com/webhooks) |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | `whsec_…` |

Create the webhook endpoint in Stripe **before** install (dummy URL is fine); post-deploy updates it to the connector URL.

### Storefront URLs (local dev)

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGINS` | `http://localhost:3000` |
| `MERCHANT_RETURN_URL` | `http://localhost:3000/order-confirmation` |

### Custom types (defaults from Stripe README)

Usually leave defaults unless post-deploy fails on type creation:

| Variable | Default |
|----------|---------|
| `CT_CUSTOM_TYPE_STRIPE_CUSTOMER_KEY` | `payment-connector-stripe-customer-id` |
| `CT_CUSTOM_TYPE_LAUNCHPAD_PURCHASE_ORDER_KEY` | `payment-launchpad-purchase-order` |

Full list: [connector deployment configuration](https://github.com/stripe/stripe-commercetools-checkout-app#deployment-configuration).

---

## Checkout Application settings

When creating the Checkout application in MC:

| Field | Local dev example |
|-------|-------------------|
| Application key | e.g. `checkout-en` — used when creating sessions |
| Origin URLs | `http://localhost:3000` (or allow all origins **only** for testing) |
| Payment return URL | `http://localhost:3000/order-confirmation` |
| Payment Integration | Stripe connector deployment; type **drop-in** or **web component** per connector docs |

After changing connector credentials or redeploying, **remove and re-add** the Payment Integration if scope validation still fails.

---

## Post-deploy checklist

1. Connect deployment status **Running** (check logs — `payment-sdk initialized` alone is not enough; scroll for `Post-deploy failed`).
2. Stripe webhook endpoint URL points at the connector processor.
3. Payment Integration **Active** on the Checkout application.
4. Connector `CTP_*` credentials match the **Stripe Checkout Connector** API client (not storefront).

### Common errors

| Symptom | Likely cause |
|---------|----------------|
| `expected scopes: … manage_recurring_payment_jobs …` | Connector client missing scopes; recreate via API Clients API |
| `manage_payment_methods` missing | Enable **Payment methods → Manage** (not Recurring orders) |
| `EUR` price not found for `country 'GB'` | Stale guest cart cookie from old `NEXT_PUBLIC_DEFAULT_COUNTRY=GB`; code now realigns empty carts to `DE`. Clear cookie `ct_guest_cart` or retry add-to-cart after deploy |
| Post-deploy: types / scope | Connector client needs `manage_types`; check `CTP_CLIENT_ID` |
| CORS on express-config | `ALLOWED_ORIGINS` empty or typo (`localhost:3000` without `http://`) |
| `[ctc] no_payment_integrations` | All Payment Integrations are **Inactive** — toggle Status to Active in MC (Checkout → Applications → Payment integrations), or activate via Payment Integrations API |
| `[ctc] error_loading_all_payment_integrations` | Active integration exists but Stripe connector failed to load — check CT Connect deployment logs, `ALLOWED_ORIGINS`, and connector API client scopes |

### Verify active payment integrations (API)

Use an admin API client with `manage_project:{projectKey}`:

```bash
# OAuth token (replace placeholders)
TOKEN=$(curl -s -X POST "https://auth.europe-west1.gcp.commercetools.com/oauth/token" \
  -u "{clientId}:{clientSecret}" \
  -d "grant_type=client_credentials&scope=manage_project:zero-to-ct-storefront" \
  | jq -r .access_token)

# List active integrations (expect count >= 1)
curl -s "https://checkout.europe-west1.gcp.commercetools.com/zero-to-ct-storefront/payment-integrations?status=eq:Active" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.count, .results[].name'

# Activate an integration (replace id and version from GET response)
curl -s -X POST "https://checkout.europe-west1.gcp.commercetools.com/zero-to-ct-storefront/payment-integrations/{integrationId}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"version":1,"actions":[{"action":"setStatus","status":"Active"}]}'
```

Payment Integrations are **inactive by default** after creation.

---

## Payment events for fulfillment

Checkout updates the `Payment.transactions` list after receiving Stripe
notifications. The storefront displays payment status from these transactions:

| Transaction | State | Customer-facing status |
|-------------|-------|------------------------|
| `Charge` | `Success` | Paid |
| `Charge` | `Failure` | Failed |
| `Authorization` | `Success` (without a Charge) | Authorized |
| `Authorization` | `Pending` or `Initial` | Processing |
| `Authorization` | `Failure` | Failed |
| `Refund` | `Success` | Partially refunded or Refunded |
| `CancelAuthorization` | `Success` | Cancelled |

When expanded `Payment` resources are unavailable, the storefront falls back to
the Order's `paymentState` for the account list and detail summary. For orders
with multiple payments, the worst customer-facing status wins (for example,
`Failed` over `Paid`).

### Subscribe to Checkout events

Use a [Subscription](https://docs.commercetools.com/checkout/checkout-events.md)
to trigger fulfillment, reconciliation, or notifications outside the browser.
Create the queue and its access policy before creating the Subscription. The
following example uses an existing AWS SQS queue with IAM authentication:

```json
{
  "key": "checkout-payment-events",
  "destination": {
    "type": "SQS",
    "queueUrl": "https://sqs.<region>.amazonaws.com/<account-id>/<queue-name>",
    "authenticationMode": "IAM",
    "region": "<aws-region>"
  },
  "events": [
    {
      "resourceTypeId": "checkout",
      "types": [
        "CheckoutPaymentAuthorized",
        "CheckoutPaymentAuthorizationFailed",
        "CheckoutPaymentCharged",
        "CheckoutPaymentChargeFailed",
        "CheckoutPaymentRefunded",
        "CheckoutPaymentRefundFailed"
      ]
    }
  ]
}
```

Create this Subscription through a trusted deployment or admin process with
`manage_subscriptions:{projectKey}`. Do not create it from the storefront BFF.
For fulfillment, react to `CheckoutPaymentCharged` (auto-capture) or
`CheckoutPaymentAuthorized` (manual capture), according to the merchant's
capture policy.

---

## Checkout Application keys (this project)

MC demo applications configured for `zero-to-ct-storefront`:

| Country | Application key | Notes |
|---------|-----------------|-------|
| `DE` | `demo-commercetools-checkout` | Standard demo checkout |
| `GB`, `US` | `demo-commercetools-checkout-taxes` | Tax-aware demo checkout |

The storefront maps the active market to the application key in `lib/commercetools/storefront-context.ts`. `NEXT_PUBLIC_DEFAULT_COUNTRY` is the first-visit fallback; the header market switcher persists a subsequent DE/GB/US choice in the HTTP-only `ct_storefront_market` cookie. Override with `CTP_CHECKOUT_APPLICATION_KEY` if needed.

### Locale and currency

| Concern | Value | Where |
|---------|-------|-------|
| Purchase (cart, checkout SDK) | `en-GB`, selected `DE` / `GB` / `US`, matching `EUR` / `GBP` / `USD` | Cookie preference with `NEXT_PUBLIC_DEFAULT_*` fallback |
| Product catalog (names, slugs) | `en-GB` | `CATALOG_LOCALE` in `storefront-context.ts` |

B2C sample data stores product copy in English. Cart and checkout use `en-GB` for UI and line item names. The market switcher selects country-specific prices and the corresponding Checkout Application.

Cart currency is immutable in commercetools, so each market keeps its own Active cart. The HTTP-only `ct_market_carts` cookie maps `DE` / `GB` / `US` to cart IDs; switching markets parks the current cart and restores the target market cart (or creates an empty one on first visit). Empty carts with a matching currency update their country in place.

---

## Storefront BFF API client (separate from Stripe connector)

The **storefront** `.env.local` client is **not** the Stripe connector client. For cart + checkout session creation it needs:

```
manage_orders:{projectKey}
manage_sessions:{projectKey}
view_published_products:{projectKey}
view_categories:{projectKey}
```

Guest cart uses server-side Cart API with `anonymousId` (requires `manage_orders`, not only `manage_my_orders`).

```bash
CTP_SESSION_URL=https://session.europe-west1.gcp.commercetools.com
NEXT_PUBLIC_CTP_PROJECT_KEY=zero-to-ct-storefront
NEXT_PUBLIC_CTP_REGION=europe-west1.gcp
NEXT_PUBLIC_DEFAULT_LOCALE=en-GB
NEXT_PUBLIC_DEFAULT_CURRENCY=EUR
NEXT_PUBLIC_DEFAULT_COUNTRY=DE
```

Stripe keys stay in Connect only — **never** add `STRIPE_SECRET_KEY` to Next.js env.

---

## Related docs

- [TECH_STACK.md](./TECH_STACK.md) — SDK clients and `CTP_CHECKOUT_URL`
- [CURSOR_SETUP.md](./CURSOR_SETUP.md) — agent rules and `.env.example`
- [TESTING.md](./TESTING.md) — e2e checkout flows (when implemented)
