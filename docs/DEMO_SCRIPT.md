# Sales demo script

Step-by-step script for demonstrating **zero-to-ct-storefront** to prospects. Aligned with the [commercetools B2C Retail demo flow](https://docs.commercetools.com/tutorials/implementation-guide/demo-flow-b2c-retail).

**Production URL:** https://zero-to-ct-storefront.vercel.app/  
**Duration:** ~10–15 minutes (Scenarios A + B).  
**Audience:** Technical buyers, solution architects, backend leads evaluating agent-assisted delivery.

---

## Prerequisites

Before the demo, verify:

1. **Production demo** is live at https://zero-to-ct-storefront.vercel.app/ (or run locally with `pnpm dev`).
2. **`.env.local`** is configured for local runs — see [`.env.example`](../.env.example) and [CHECKOUT.md](./CHECKOUT.md).
3. **Payment Integrations** are **Active** in Merchant Center (Checkout → Applications). If checkout shows `no_payment_integrations`, see [CHECKOUT.md troubleshooting](./CHECKOUT.md).
4. **Stripe test mode** is enabled on the connector (test keys in CT Connect).

Quick health check:

```bash
curl -s https://zero-to-ct-storefront.vercel.app/api/health | jq .
```

Expect `"ok": true` and a valid `projectKey`. For local dev, use `http://localhost:3000/api/health`.

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
2. Show line items, quantity controls, **discount code form**, and **subtotal / savings / total** summary.
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
2. Edit **profile** (name/email) and save — mention email uniqueness check.
3. **Add an address**, set default shipping, edit city, then delete.
4. **Change password** — sign in again with the new password.
5. Show **order history** table (includes Scenario A order if same session); open an order detail link when available.
6. Sign out via the account menu.

---

## Scenario C — Password reset (development only)

1. Click **Sign in** → **Forgot password**.
2. In development (`NODE_ENV !== 'production'`), the API response includes `devResetUrl` (no email sent in this PoC).
3. Open the reset URL → set a new password on `/reset-password`.

**Talking point:** Production would integrate an ESP via commercetools Connect; this PoC documents the flow without email delivery.

---

## Scenario D — Promotions (~3 min)

Demonstrates Product Discounts on discovery and Cart Discount codes before checkout.

### 1. Product discount on PDP

1. Open **Charlie Armchair** (`/product/charlie-armchair`).
2. Point out the **strikethrough price**: €499.00 → **€424.15** (15% off armchairs via Product Discount `NewArrivals15pctOff`).
3. Add to cart.

**Talking point:** Product Discounts are pre-calculated on Product Projections with `priceCountry=DE` — the storefront displays CT-selected prices, it does not recalculate promotions.

### 2. Cart discount code (BOGO)

1. Open **Cart** (`/cart`) with **two** qualifying furniture items (e.g. add **Bruno Chair** `BARM-03` twice, or one Charlie + one Bruno).
2. Enter discount code **`BOGO`** and click **Apply**.
3. Show **Savings** line and updated **Total** (Buy One Get One Free on furniture — cheapest item free).
4. Proceed to checkout and confirm the **order summary** matches cart totals.

**Demo fixtures:** see `lib/commercetools/demo-promotions.ts` (`CARM-023`, `BOGO`).

---

## Talking points summary

| Topic | Message |
|-------|---------|
| **Architecture** | Next.js BFF pattern — commercetools credentials server-side only |
| **Checkout** | commercetools Checkout + Stripe connector; Browser SDK embed |
| **Auth** | Customer OAuth via BFF; cart merge on login/register |
| **Agent-assisted delivery** | ~85–95% agent-generated code; human owns MC/Stripe setup and commerce review |
| **Timeline** | ~2-week PoC by a backend-focused developer (see [TIME_REPORT.md](./TIME_REPORT.md)) |
| **Promotions** | Product Discounts on PLP/PDP; Cart Discount codes via BFF before Checkout session |

---

## Known limitations (honest demo close)

Refer to [ROADMAP.md](./ROADMAP.md) Phase 8+ for planned work:

- No **mobile cart drawer** (Phase 7 remainder)
- No **Quick View** on listing pages
- No **multi-country switcher** in UI (env-driven `DE` / `EUR` defaults)
- **Best sellers** use a catalog heuristic (not real sales ranking)
- **Email verification** after email change (no ESP in PoC)
- **Brand facet** only appears when `variants.attributes.brand` exists in the CT project

These gaps are intentional PoC scope — the roadmap shows how to extend toward full B2C Retail parity.

---

## Related docs

- [CHECKOUT.md](./CHECKOUT.md) — Stripe + Checkout setup
- [CUSTOMER_AUTH.md](./CUSTOMER_AUTH.md) — Auth architecture
- [DEPLOY.md](./DEPLOY.md) — Production deployment
- [TESTING.md](./TESTING.md) — E2E and unit test strategy
