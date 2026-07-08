# Testing

Testing strategy for **zero-to-ct-storefront**. Unit tests run in CI without commercetools credentials. E2E tests hit a live CT demo project and run **locally only**.

---

## Pyramid

| Layer | Tool | Scope | CI |
|-------|------|-------|-----|
| Unit — lib | Vitest | `format`, product mappers, mocked `products` | Yes |
| Unit — API | Vitest (node) | `/api/health`, `/api/products` route handlers | Yes |
| Unit — UI | Vitest + Testing Library | product cards, search form | Yes |
| E2E | Playwright | discovery flow + API smoke against live CT | No (local only) |

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

**CI:** GitHub Actions runs the same checks on pull requests and merges to `main` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

---

## Unit tests

**Location:** `**/*.{test,spec}.{ts,tsx}` next to source files.

**Config:** [`vitest.config.ts`](../vitest.config.ts), setup in [`vitest.setup.ts`](../vitest.setup.ts).

**Mocks:**
- `test/mocks/server-only.ts` — stubs `server-only` imports
- `test/mocks/next-image.tsx` — renders `<img>` instead of `next/image`
- `test/fixtures/product-projection.ts` — sample `ProductProjection` data

**API route tests** mock `@/lib/commercetools/products` or `@/lib/commercetools/api-root` — no network calls.

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
- Homepage best sellers grid
- Search for `bed`
- Product detail page (`/product/orion-double-bed`)
- `GET /api/health` and `GET /api/products`

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

When implementing cart/checkout (next phase):

1. Add mapper/unit tests for cart logic in `lib/`
2. Add route handler tests for new `/api/cart` endpoints
3. Add component tests for cart UI
4. Extend `e2e/` with add-to-cart and checkout flows

Keep E2E scenarios focused on user-visible flows, not implementation details.
