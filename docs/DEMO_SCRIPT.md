# Sales demo script

Step-by-step script for demonstrating **zero-to-ct-storefront** to prospects. Aligned with the [commercetools B2C Retail demo flow](https://docs.commercetools.com/tutorials/implementation-guide/demo-flow-b2c-retail).

**Duration:** ~10–15 minutes (Scenarios A + B).  
**Audience:** Technical buyers, solution architects, backend leads evaluating agent-assisted delivery.

---

## Prerequisites

Before the demo, verify:

1. **Local or deployed app** is running (`pnpm dev` or production URL).
2. **`.env.local`** is configured — see [`.env.example`](../.env.example) and [CHECKOUT.md](./CHECKOUT.md).
3. **Payment Integrations** are **Active** in Merchant Center (Checkout → Applications). If checkout shows `no_payment_integrations`, see [CHECKOUT.md troubleshooting](./CHECKOUT.md).
4. **Stripe test mode** is enabled on the connector (test keys in CT Connect).

Quick health check:

```bash
curl -s http://localhost:3000/api/health | jq .
```

Expect `"ok": true` and a valid `projectKey`.

---

## Scenario A — Guest purchase (~5 min)

Demonstrates the core B2C path: discover → cart → checkout → order confirmation.

### 1. Product discovery

1. Open the **homepage** (`/`).
2. Point out the **Best Sellers** grid — live data from commercetools Product Projections (117 products in B2C sample data).
3. Use **search** (`/search`): type `bed` and watch **autocomplete suggestions** (Search Term Suggestions API).
4. Submit search or pick a suggestion to open results.
5. On the results page, refine with **facet filters** (price, color, brand when present in sample data).
6. Open a product from search results (e.g. a bed or mattress).

**Talking point:** Full-text search and **faceted filters** use the **Product Search API** via a Next.js BFF — no commercetools credentials in the browser. Autocomplete uses **Search Term Suggestions** from product `searchKeywords`.

### 2. Add to cart

1. On the **Product Detail Page**, select a variant if multiple exist.
2. Click **Add to cart**.
3. Show the **cart badge** updating in the header.

### 3. Cart review

1. Navigate to **Cart** (`/cart`).
2. Show line items, quantity controls, and subtotal.
3. Click **Proceed to checkout**.

### 4. Checkout (manual payment step)

The Checkout Browser SDK embed loads on `/checkout`.

1. Show the **order summary** (left) and **Checkout embed** (right).
2. Enter a **shipping address** (Germany / `DE` matches default checkout app).
3. Select a **shipping method**.
4. **Manual step — Stripe test card:**

   | Field | Value |
   |-------|-------|
   | Card number | `4242 4242 4242 4242` |
   | Expiry | Any future date (e.g. `12/34`) |
   | CVC | Any 3 digits (e.g. `123`) |

5. Complete payment. You are redirected to **Order confirmation** (`/order-confirmation?orderId=...`).

**Talking point:** Payments go through **commercetools Checkout** + **Stripe connector** (CT Connect). The storefront never holds Stripe secret keys.

### 5. Optional — Merchant Center

Open Merchant Center → **Orders** and show the new order created from the demo.

---

## Scenario B — Registered customer (~3 min)

Demonstrates customer auth, cart merge, and order history.

### 1. Register or sign in

1. Click **Account** in the header → **Register** (or **Sign in** if account exists).
2. Create a test account (e.g. `demo+{date}@example.com`).

**Talking point:** Customer tokens stay in **httpOnly cookies**; the BFF proxies all commercetools Customer API calls.

### 2. Cart merge

1. **Before** signing in, add an item to the cart as a guest.
2. Sign in. The guest cart **merges** with any existing customer cart.
3. Open **Cart** — merged items are visible.

### 3. Account and order history

1. Navigate to **Account** (`/account`).
2. Show profile summary and **order history** table (includes Scenario A order if same session).
3. Sign out via the account menu.

---

## Scenario C — Password reset (development only)

1. Click **Sign in** → **Forgot password**.
2. In development (`NODE_ENV !== 'production'`), the API response includes `devResetUrl` (no email sent in this PoC).
3. Open the reset URL → set a new password on `/reset-password`.

**Talking point:** Production would integrate an ESP via commercetools Connect; this PoC documents the flow without email delivery.

---

## Talking points summary

| Topic | Message |
|-------|---------|
| **Architecture** | Next.js BFF pattern — commercetools credentials server-side only |
| **Checkout** | commercetools Checkout + Stripe connector; Browser SDK embed |
| **Auth** | Customer OAuth via BFF; cart merge on login/register |
| **Agent-assisted delivery** | ~85–95% agent-generated code; human owns MC/Stripe setup and commerce review |
| **Timeline** | ~2-week PoC by a backend-focused developer (see [TIME_REPORT.md](./TIME_REPORT.md)) |
| **Testing** | Unit tests in CI; E2E cart/checkout locally with live CT project |

---

## Known limitations (honest demo close)

Refer to [ROADMAP.md](./ROADMAP.md) Phase 5+ for planned work:

- No **wishlist** / shopping lists
- No **Quick View** on listing pages
- No **multi-country switcher** in UI (env-driven `DE` / `EUR` defaults)
- **Best sellers** use a catalog heuristic (not real sales ranking)
- **Order detail page** not implemented (`/account` shows list only)
- **Brand facet** only appears when `variants.attributes.brand` exists in the CT project

These gaps are intentional PoC scope — the roadmap shows how to extend toward full B2C Retail parity.

---

## Related docs

- [CHECKOUT.md](./CHECKOUT.md) — Stripe + Checkout setup
- [CUSTOMER_AUTH.md](./CUSTOMER_AUTH.md) — Auth architecture
- [DEPLOY.md](./DEPLOY.md) — Production deployment
- [TESTING.md](./TESTING.md) — E2E and unit test strategy
