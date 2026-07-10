# Build Log

Chronological log of development time and milestones. Used for sales demos and `docs/TIME_REPORT.md`.

## Template (copy for each entry)

```markdown
### YYYY-MM-DD — Short title
- **Time:** Xh
- **Phase:** phase-0-setup | phase-1-scaffold | phase-2-core | phase-3-demo
- **Milestone:** What was completed
- **Agent vs manual:** e.g. 70% agent / 30% manual review
- **Notes:** Blockers, decisions, learnings
```

---

### 2026-07-08 — Repository bootstrap
- **Time:** —
- **Phase:** phase-0-setup
- **Milestone:** GitHub repo created; agent coding docs, TECH_STACK, CURSOR_SETUP
- **Agent vs manual:** Agent scaffolded docs; human created GitHub repo
- **Notes:** —

### 2026-07-08 — Phase 0 complete — CT project ready
- **Time:** —
- **Phase:** phase-0-setup
- **Milestone:** Demo CT project + API client; Product Search + Product Projection Search enabled; `.env` files; coss skill
- **Agent vs manual:** Human — MC setup, credentials, commits
- **Notes:** UI library — coss ui + Tailwind v4

### 2026-07-08 — Phase 1 scaffold + homepage
- **Time:** —
- **Phase:** phase-1-scaffold
- **Milestone:** Flattened nested app to repo root; CT SDK v5 + platform-sdk v9; `/api/health`, `/api/products`; homepage with live products (117 total from B2C sample data)
- **Agent vs manual:** ~85% agent / 15% human (env, CT project existed)
- **Notes:** `apiRoot.get()` health check failed on client scopes — health uses `productProjections` instead

### 2026-07-08 — Discovery pages (search, PDP, bestsellers)
- **Time:** —
- **Phase:** phase-2-core
- **Milestone:** `/search` with `?q=` full-text search; `/product/[slug]` PDP; homepage compact best-seller tiles via `listBestSellingProducts()` (excludes new-arrival products/category; oldest-first). Catalog copy in `en-GB`; purchase defaults `de-DE` / `DE` / `EUR`.
- **Agent vs manual:** ~90% agent
- **Notes:** Orders API unavailable without `view_orders` scope — bestsellers use catalog heuristic instead

### 2026-07-08 — Test suite (unit + E2E)
- **Time:** —
- **Phase:** phase-2-core
- **Milestone:** Vitest unit tests for lib, API routes, and components (34 tests). Playwright E2E for discovery flow + API smoke (5 tests, live CT locally). Extracted `product-mappers.ts` for testable pure functions.
- **Agent vs manual:** ~95% agent
- **Notes:** E2E runs locally with `.env.local`; skipped in CI without `CTP_*`. See `docs/TESTING.md`.

### 2026-07-09 — Stripe Checkout MC setup + guest cart/checkout code
- **Time:** —
- **Phase:** phase-2-core
- **Milestone:** Stripe connector + Checkout Applications configured in MC; `docs/CHECKOUT.md`; guest cart BFF (`/api/cart/*`), checkout session (`/api/checkout/session`), pages `/cart`, `/checkout`, `/order-confirmation`; Checkout Browser SDK embed. Application keys: `demo-commercetools-checkout` (DE), `demo-commercetools-checkout-taxes` (GB/US).
- **Agent vs manual:** Human — Stripe/Connect/MC; agent — storefront implementation
- **Notes:** Storefront BFF needs **separate** API client with `manage_orders` + `manage_sessions` (not the Stripe connector client). See `docs/CHECKOUT.md` and `.env.example`.

### 2026-07-10 — Guest checkout payment fix (`no_payment_integrations`)
- **Time:** —
- **Phase:** phase-2-core
- **Milestone:** Activated Stripe Payment Integrations on both checkout applications via Payment Integrations API; improved checkout error messages; fixed `CTP_CHECKOUT_APPLICATION_KEY` override; extended `docs/CHECKOUT.md` troubleshooting.
- **Agent vs manual:** Agent — API activation + storefront hardening; manual — end-to-end payment test in browser with Stripe test card
- **Notes:** Root cause was inactive Payment Integrations (default after MC creation). Verify with `payment-integrations?status=eq:Active` (expect count ≥ 1).

### 2026-07-10 — Customer authentication and account page
- **Time:** —
- **Phase:** phase-2-core
- **Milestone:** Customer login/register/logout, password reset, cart merge on auth, `/account` with order history, header account menu, BFF routes under `/api/auth/*` and `/api/customer/orders`; docs in `docs/CUSTOMER_AUTH.md`.
- **Agent vs manual:** ~95% agent
- **Notes:** Add `manage_customers`, `manage_my_profile`, and `manage_my_orders` to Frontend API client scopes. Dev-only `devResetUrl` on forgot-password when `NODE_ENV !== 'production'`.
