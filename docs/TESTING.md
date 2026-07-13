# Testing

Testing strategy for **zero-to-ct-storefront**. Unit tests run in CI without commercetools credentials. E2E tests hit a live CT demo project and run **locally only**.

---

## Pyramid

| Layer | Tool | Scope | CI |
|-------|------|-------|-----|
| Unit — lib | Vitest | `format`, product/category mappers, mocked `products`/`categories` | Yes |
| Unit — API | Vitest (node) | `/api/health`, `/api/products`, `/api/categories`, `/api/cart/items` | Yes |
| Unit — UI | Vitest + Testing Library | product cards, search form | Yes |
| E2E | Playwright | discovery + cart/checkout + API smoke against live CT | No (local only) |

---

## Commands

```bash
# Unit tests (watch)
pnpm test

# Unit tests (single run — use before commits)
pnpm test:unit

# E2E (requires .env.local with CTP_* and builds the app)
pnpm exec playwright install chromium   # first time only
pnpm test:e2e

# E2E with Playwright UI mode
pnpm test:e2e:ui
```

Before finishing a task, run:

```bash
pnpm lint && pnpm typecheck && pnpm test:unit
```

**CI:** GitHub Actions runs `lint`, `typecheck`, `test:unit`, and `build` on pull requests and merges to `main` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). The build job requires `CTP_*` GitHub secrets.

---

## Unit tests

**Location:** `**/*.{test,spec}.{ts,tsx}` next to source files.

**Config:** [`vitest.config.ts`](../vitest.config.ts), setup in [`vitest.setup.ts`](../vitest.setup.ts).

**Mocks:**
- `test/mocks/server-only.ts` — stubs `server-only` imports
- `test/mocks/next-image.tsx` — renders `<img>` instead of `next/image`
- `test/fixtures/product-projection.ts` — sample `ProductProjection` data

**API route tests** mock `@/lib/commercetools/products`, `@/lib/commercetools/cart`, or `@/lib/commercetools/api-root` — no network calls.

**Component tests** use React Testing Library with semantic queries (`getByRole`, `getByLabelText`).

---

## E2E tests (Playwright)

**Location:** [`e2e/`](../e2e/)

**Config:** [`playwright.config.ts`](../playwright.config.ts)

**Requirements:**
- `.env.local` with all `CTP_*` variables (see [`.env.example`](../.env.example))
- Playwright loads `.env.local` automatically when starting tests
- Tests are **skipped** when `CTP_PROJECT_KEY` is not set

**What is tested live:**

| File | Scenarios |
|------|-----------|
| `discovery.spec.ts` | Homepage best sellers + new arrivals, category nav → CLP, custom 404, search for `bed`, PDP |
| `cart-checkout.spec.ts` | Add to cart from homepage, cart page line items, checkout embed load, cart API |
| `api.spec.ts` | `GET /api/health`, `GET /api/products`, `GET /api/categories` |

**E2E boundaries:** Tests verify cart and checkout **session load** (order summary + `[data-ctc]` embed container). **Full Stripe payment** is not automated — the Checkout Browser SDK iframe is flaky in CI and requires manual card entry. Use [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for payment demo steps.

**webServer:** Playwright runs `pnpm build && pnpm start` on port 3000 (reuses an existing server locally when available).

---

## What is mocked vs live

| Area | Unit | E2E |
|------|------|-----|
| commercetools API | Mocked | Live |
| Next.js pages | N/A | Live (built app) |
| React components | Rendered in jsdom | Real browser |
| Credentials | Not needed | `.env.local` required |

---

## Adding tests for new features

1. Add mapper/unit tests for business logic in `lib/`
2. Add route handler tests for new `/api/*` endpoints (mock CT layer)
3. Add component tests for new UI where behavior is non-trivial
4. Extend `e2e/` with focused user-visible flows

Keep E2E scenarios focused on user-visible flows, not implementation details.
