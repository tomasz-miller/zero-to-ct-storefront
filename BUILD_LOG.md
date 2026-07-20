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

### 2026-07-20 — PoC documentation closure
- **Time:** 0.25h
- **Phase:** phase-3-demo
- **Milestone:** Docs hygiene after Phase 11 — `DEPLOY.md` documents Vercel auto-deploy from `main` (CLI optional); `DEMO_SCRIPT` talking points for multi-market / bestsellers / Order again; `AGENT_CODING` points to ROADMAP Phases 4–11 complete; ROADMAP Last updated + TIME_REPORT sync. Commerce MCP confirmed out of storefront scope (IDE/ops only).
- **Agent vs manual:** ~95% agent
- **Notes:** No product code. No manual production deploy.

### 2026-07-20 — Phase 11 reorder + real bestsellers
- **Time:** 1.75h
- **Phase:** phase-11-post-purchase
- **Milestone:** Order again (`POST /api/cart/reorder`, batch `addLineItem`, UI on order detail + account history); homepage Best Sellers ranked from project Orders (`manage_orders`) with catalog heuristic fallback; 343 unit tests; ROADMAP/TIME_REPORT/DEMO_SCRIPT sync. Commerce MCP marked out of storefront scope.
- **Agent vs manual:** ~95% agent
- **Notes:** Vercel deploy remains automatic. No new API client scopes required (`manage_orders` already covers Orders read).

### 2026-07-16 — Phase 8/10 code-review fixes
- **Time:** (included in 1h low-stock + BFF tests entry)
- **Phase:** phase-8-inventory / phase-10-quality
- **Milestone:** Channel availability uses min on-stock quantity (not sum); `availableQuantity === 0` → out of stock with synced `isOnStock`; ATC/UI use `status`; E2E finder simplified; boundary unit tests.
- **Agent vs manual:** ~95% agent
- **Notes:** Client components import helpers from `product-mappers` (not server-only `products`).

### 2026-07-16 — Phase 8 low-stock + Phase 10 BFF route tests
- **Time:** 1h
- **Phase:** phase-8-inventory / phase-10-quality
- **Milestone:** Low-stock badges (`Only X left` when `availableQuantity` ≤ 5) on PDP/PLP; unit tests for remaining BFF routes (cart, auth, customer addresses/orders, wishlist delete/move-to-cart); 320 unit tests; ROADMAP/TIME_REPORT sync.
- **Agent vs manual:** ~95% agent
- **Notes:** Custom threshold on ProductVariant.availability (no Inventory API query). commerce-mcp remains future.

### 2026-07-16 — Per-market cart persistence
- **Time:** 2.25h
- **Phase:** phase-9-multi-market
- **Milestone:** Parked DE/GB/US carts in HTTP-only `ct_market_carts` cookie; market switch restores the target cart or creates an empty one; signed-in lookup by country/currency; confirm modal copy updated to “save”; auth claims parked guest carts; unit + E2E coverage; CHECKOUT/DEMO_SCRIPT docs.
- **Agent vs manual:** ~95% agent
- **Notes:** commercetools cart currency remains immutable; multiple Active carts per customer/guest are intentional.

### 2026-07-16 — Phase 9 review fixes
- **Time:** 0.75h
- **Phase:** phase-9-multi-market
- **Milestone:** Fixed signed-in customer cart realignment on market switch (recreate cart when currency/items conflict); `realignCartForStorefront` no longer swallows CT errors; MarketSwitcher syncs with server prop and uses dismissible auto-hide notices; checkout session falls back to active market country; unit coverage for guest/customer realign paths.
- **Agent vs manual:** ~95% agent
- **Notes:** Follow-up to Phase 9 code review.

### 2026-07-16 — Phase 9 — multi-market switcher
- **Time:** 3.5h
- **Phase:** phase-9-multi-market
- **Milestone:** Added a header switcher for Germany (EUR), the United Kingdom (GBP), and the United States (USD). The HTTP-only `ct_storefront_market` cookie drives server-side price selection, cart country alignment, and Checkout Application selection; incompatible guest carts are recreated with an in-store notice. Added unit and E2E coverage, and synchronized roadmap, demo, checkout, testing, and time-report documentation.
- **Agent vs manual:** ~95% agent
- **Notes:** Product copy remains English (`en-GB`) because this sample catalog does not provide a complete translated catalog. Changing a non-empty guest cart across currencies creates a new cart rather than mixing incompatible prices.

### 2026-07-15 — Checkout default address button
- **Time:** 0.5h
- **Phase:** phase-3-demo
- **Milestone:** Added `Use my default address` on checkout for signed-in customers; BFF copies default shipping/billing and email from Customer to Cart, then restarts embedded `checkoutFlow`; documented Customer address book boundary.
- **Agent vs manual:** ~95% agent
- **Notes:** Complete Checkout does not read `Customer.addresses` directly; Cart is the bridge.

### 2026-07-15 — Payment status review fixes
- **Time:** 0.5h
- **Phase:** phase-3-demo
- **Milestone:** Hardened transaction-derived payment status (failed capture, multi-payment worst-case, paymentState fallback, auth retry); theme-aware Checkout SDK styles; customer-friendly Stripe provider label; expanded unit tests.
- **Agent vs manual:** ~95% agent
- **Notes:** Follow-up to code review of payment status visibility work.

### 2026-07-15 — Checkout payment status visibility
- **Time:** 1h
- **Phase:** phase-3-demo
- **Milestone:** Derived customer-facing payment statuses from expanded Checkout Payment transactions; added payment details to account order views; aligned embedded Checkout colors with the storefront; documented Checkout event subscriptions and the decision to retain `checkoutFlow`.
- **Agent vs manual:** ~95% agent
- **Notes:** `Payment.transactions` is the source of truth for Stripe outcomes. Subscription deployment still requires an existing queue and an admin deployment process.

### 2026-07-14 — Quick View code review fixes
- **Time:** 0.5h
- **Phase:** phase-4-discovery, phase-10-quality
- **Milestone:** Touch-friendly Quick View visibility (`pointer: coarse`), OOS badge repositioned, multi-variant guard in dialog, dialog closes after add-to-cart, expanded unit/E2E tests, correlation ID client test; 220 unit tests.
- **Agent vs manual:** ~95% agent
- **Notes:** Follow-up to code review; no production redeploy in this pass.

### 2026-07-14 — Phase 4 slice 3 + Phase 10 slice 1 — Quick View and quality
- **Time:** 1.5h
- **Phase:** phase-4-discovery, phase-10-quality
- **Milestone:** `ProductQuickViewDialog` (coss Dialog) on `ProductCardCompact`; image, price, availability, wishlist, add-to-cart, link to PDP; `withCorrelationIdMiddleware()` in CT client; unit tests for `POST /api/checkout/session`; 216 unit + 34 E2E tests; docs sync (ROADMAP, DEMO_SCRIPT, TESTING, TIME_REPORT). Production deploy pending manual `pnpm dlx vercel --prod`.
- **Agent vs manual:** ~95% agent
- **Notes:** Quick View reuses listing `StorefrontProduct` — no extra BFF. Correlation ID visible in CT API response headers during build. E2E Quick View scenario passes; deploy requires manual Vercel approval.

### 2026-07-14 — Phase 8 — inventory availability
- **Time:** 1.5h
- **Phase:** phase-8-inventory
- **Milestone:** `StorefrontAvailability` + `mapAvailability` from Product Projections; `ProductAvailability` badge on PDP/PLP; disabled add-to-cart + `OutOfStockError` BFF guard (HTTP 409); `demo-inventory.ts` fixtures; 207 unit + 33 E2E tests; docs sync (ROADMAP, DEMO_SCRIPT, TESTING, TIME_REPORT).
- **Agent vs manual:** ~95% agent
- **Notes:** Uses eventually consistent `ProductVariant.availability` for display; low stock messaging remains future.

### 2026-07-14 — Phase 7 — mobile cart drawer
- **Time:** 1h
- **Phase:** phase-7-promotions
- **Milestone:** coss Sheet installed; `CartDrawer` with `CartLineItems` reuse; responsive `CartNavLink` (Sheet on `< md`, link to `/cart` on desktop); checkout CTA closes drawer; unit + E2E mobile coverage.
- **Agent vs manual:** ~95% agent
- **Notes:** Completes Phase 7 remainder from ROADMAP.

### 2026-07-08 — Repository bootstrap
- **Time:** 1h
- **Phase:** phase-0-setup
- **Milestone:** GitHub repo created; agent coding docs, TECH_STACK, CURSOR_SETUP
- **Agent vs manual:** Agent scaffolded docs; human created GitHub repo
- **Notes:** —

### 2026-07-08 — Phase 0 complete — CT project ready
- **Time:** 1.5h
- **Phase:** phase-0-setup
- **Milestone:** Demo CT project + API client; Product Search + Product Projection Search enabled; `.env` files; coss skill
- **Agent vs manual:** Human — MC setup, credentials, commits
- **Notes:** UI library — coss ui + Tailwind v4

### 2026-07-08 — Phase 1 scaffold + homepage
- **Time:** 2h
- **Phase:** phase-1-scaffold
- **Milestone:** Flattened nested app to repo root; CT SDK v5 + platform-sdk v9; `/api/health`, `/api/products`; homepage with live products (117 total from B2C sample data)
- **Agent vs manual:** ~85% agent / 15% human (env, CT project existed)
- **Notes:** `apiRoot.get()` health check failed on client scopes — health uses `productProjections` instead

### 2026-07-08 — Discovery pages (search, PDP, bestsellers)
- **Time:** 1.5h
- **Phase:** phase-2-core
- **Milestone:** `/search` with `?q=` full-text search; `/product/[slug]` PDP; homepage compact best-seller tiles via `listBestSellingProducts()` (excludes new-arrival products/category; oldest-first). Catalog copy in `en-GB`; purchase defaults `de-DE` / `DE` / `EUR`.
- **Agent vs manual:** ~90% agent
- **Notes:** Orders API unavailable without `view_orders` scope — bestsellers use catalog heuristic instead

### 2026-07-08 — Test suite (unit + E2E)
- **Time:** 1h
- **Phase:** phase-2-core
- **Milestone:** Vitest unit tests for lib, API routes, and components (34 tests). Playwright E2E for discovery flow + API smoke (5 tests, live CT locally). Extracted `product-mappers.ts` for testable pure functions.
- **Agent vs manual:** ~95% agent
- **Notes:** E2E runs locally with `.env.local`; skipped in CI without `CTP_*`. See `docs/TESTING.md`.

### 2026-07-09 — Stripe Checkout MC setup + guest cart/checkout code
- **Time:** 7h
- **Phase:** phase-2-core
- **Milestone:** Stripe connector + Checkout Applications configured in MC; `docs/CHECKOUT.md`; guest cart BFF (`/api/cart/*`), checkout session (`/api/checkout/session`), pages `/cart`, `/checkout`, `/order-confirmation`; Checkout Browser SDK embed. Application keys: `demo-commercetools-checkout` (DE), `demo-commercetools-checkout-taxes` (GB/US).
- **Agent vs manual:** Human — Stripe/Connect/MC; agent — storefront implementation
- **Notes:** Storefront BFF needs **separate** API client with `manage_orders` + `manage_sessions` (not the Stripe connector client). See `docs/CHECKOUT.md` and `.env.example`.

### 2026-07-10 — Guest checkout payment fix (`no_payment_integrations`)
- **Time:** 0.5h
- **Phase:** phase-2-core
- **Milestone:** Activated Stripe Payment Integrations on both checkout applications via Payment Integrations API; improved checkout error messages; fixed `CTP_CHECKOUT_APPLICATION_KEY` override; extended `docs/CHECKOUT.md` troubleshooting.
- **Agent vs manual:** Agent — API activation + storefront hardening; manual — end-to-end payment test in browser with Stripe test card
- **Notes:** Root cause was inactive Payment Integrations (default after MC creation). Verify with `payment-integrations?status=eq:Active` (expect count ≥ 1).

### 2026-07-10 — Customer authentication and account page
- **Time:** 1.5h
- **Phase:** phase-2-core
- **Milestone:** Customer login/register/logout, password reset, cart merge on auth, `/account` with order history, header account menu, BFF routes under `/api/auth/*` and `/api/customer/orders`; docs in `docs/CUSTOMER_AUTH.md`.
- **Agent vs manual:** ~95% agent
- **Notes:** Add `manage_customers`, `manage_my_profile`, and `manage_my_orders` to Frontend API client scopes. Dev-only `devResetUrl` on forgot-password when `NODE_ENV !== 'production'`.

### 2026-07-10 — Product roadmap
- **Time:** 0.5h
- **Phase:** phase-2-core
- **Milestone:** Created `docs/ROADMAP.md` with implemented capabilities inventory, gaps vs commercetools B2C Retail demo flow, and prioritized phases 3–10; linked from `docs/AGENT_CODING.md`.
- **Agent vs manual:** ~95% agent
- **Notes:** Roadmap complements BUILD_LOG (history) and AGENT_CODING (phases 0–3). Next immediate work: phase-3-demo (deploy, demo script, E2E checkout).

### 2026-07-10 — Phase 3 partial — demo readiness
- **Time:** 1.5h
- **Phase:** phase-3-demo
- **Milestone:** E2E cart/checkout (`e2e/cart-checkout.spec.ts`); unit tests for `POST /api/cart/items`; `docs/DEMO_SCRIPT.md`, `docs/TIME_REPORT.md`, `docs/DEPLOY.md`; updated ROADMAP, TESTING, AGENT_CODING.
- **Agent vs manual:** ~95% agent
- **Notes:** E2E stops at checkout embed load (no automated Stripe payment). Deploy to Vercel remains human step — see `docs/DEPLOY.md`.

### 2026-07-13 — Phase 4 partial — category discovery slice
- **Time:** 1h
- **Phase:** phase-4-discovery
- **Milestone:** Category module (`lib/commercetools/categories.ts`), `GET /api/categories`, `/category/[slug]` CLP via Product Search `categoriesSubTree`, header category navigation, homepage New Arrivals section, custom `app/not-found.tsx`; unit + E2E coverage.
- **Agent vs manual:** ~95% agent
- **Notes:** Facets, sort, pagination UI, and search autocomplete remain planned for next slice. Deploy still human step per `docs/DEPLOY.md`.

### 2026-07-13 — Phase 4 slice 2b+2c — facets + search autocomplete
- **Time:** 0.5h
- **Phase:** phase-4-discovery
- **Milestone:** Product Search faceted filters (price, color, brand) on `/search` and `/category/[slug]` with URL-driven state; Search Term Suggestions autocomplete via `/api/search/suggestions` and coss `Autocomplete`; unit + E2E coverage.
- **Agent vs manual:** ~95% agent
- **Notes:** Brand facet depends on `variants.attributes.brand` in sample data — section hidden when buckets are empty. Deploy still human step per `docs/DEPLOY.md`.

- **Time:** 1h
- **Phase:** phase-4-discovery
- **Milestone:** Product Search sort (`relevance`, `newest`, `price-asc`, `price-desc`) in `lib/commercetools/products.ts`; URL params `?sort=` and `?page=` on `/search` and `/category/[slug]`; shared `ProductListingControls` (sort toolbar + bottom pagination); BFF `sort` on `/api/products`; code-review fixes (page clamp/redirect, CT offset cap, category relevance guard, a11y); unit + E2E coverage.
- **Agent vs manual:** ~95% agent
### 2026-07-14 — Phase 5 slice 1 — order detail + extended profile
- **Time:** 1h
- **Phase:** phase-5-account
- **Milestone:** Extended `StorefrontCustomer` (member since, addresses) and `StorefrontOrderDetail` mappers; `getMyOrder()` via `GET /me/orders/{id}`; `/account/orders/[id]` detail page with line items, addresses, and shipping summary; linked order history on `/account`; unit tests for mappers and `getMyOrder`; E2E account flow (`e2e/account.spec.ts`).
- **Agent vs manual:** ~95% agent
- **Notes:** Profile edit and change password remain Phase 5b. Deploy still human step per `docs/DEPLOY.md`.

### 2026-07-14 — Checkout cart session cleanup
- **Time:** 0.25h
- **Phase:** phase-2-core
- **Milestone:** Clear `ct_guest_cart` through `POST /api/cart/complete` and reset the cart badge when the Checkout Browser SDK reports `checkout_completed`.
- **Agent vs manual:** ~95% agent
- **Notes:** Prevents an ordered cart from remaining visible in the storefront header.

### 2026-07-14 — Phase 5 slice 2 — account management
- **Time:** 1.5h
- **Phase:** phase-5-account
- **Milestone:** Profile edit (`PATCH /api/customer/profile`), address CRUD (`/api/customer/addresses/*`), change password (`POST /api/customer/password`); email pre-check via `lowercaseEmail` + `DuplicateField` handling; account UI on `/account`; unit + E2E account coverage; docs sync (ROADMAP, CUSTOMER_AUTH, DEMO_SCRIPT, TESTING, TIME_REPORT).
- **Agent vs manual:** ~95% agent
- **Notes:** Password change clears customer session and prompts re-login. Email verification remains out of scope without ESP.

### 2026-07-14 — Phase 6 — wishlist / shopping lists
- **Time:** 1.5h
- **Phase:** phase-6-wishlist
- **Milestone:** Shopping Lists module (`lib/commercetools/shopping-lists.ts`), wishlist session cookie, BFF `/api/wishlist/*`, heart icon on PLP/PDP, `/wishlist` page, move-to-cart orchestration, guest→customer merge on auth; 183 unit + 24 E2E tests; docs sync (ROADMAP, TESTING, DEMO_SCRIPT, DEPLOY, CUSTOMER_AUTH).
- **Agent vs manual:** ~95% agent
- **Notes:** Requires `manage_shopping_lists` scope on Frontend API client.

### 2026-07-14 — Fix order–customer linking for logged-in checkout
- **Time:** 0.75h
- **Phase:** phase-7-promotions
- **Milestone:** Customer-aware cart session resolution (`findCustomerCart`, `setCustomerId`, merge into existing customer cart); `reconcileCartOnAuth` on login/register; resolve before checkout and cart mutations; guest cart cleanup after merge; 203 unit tests; docs sync (CUSTOMER_AUTH).
- **Agent vs manual:** ~95% agent
- **Notes:** Follow-up to code review — `getCartForCheckout` and cart mutations now call the same resolve path as `addLineItem`.

### 2026-07-14 — Phase 7 — promotions core
- **Time:** 1.5h
- **Phase:** phase-7-promotions
- **Milestone:** Product Discount display on PLP/PDP (`priceCountry` + `StorefrontPrice`); cart discount code apply/remove (`/api/cart/discount-code`); cart summary with savings; demo fixtures `CARM-023` + `BOGO`; 193 unit + 27 E2E tests; docs sync (ROADMAP, DEMO_SCRIPT, TESTING, TIME_REPORT).
- **Agent vs manual:** ~95% agent
- **Notes:** Discount codes must be applied before checkout session creation.

### 2026-07-14 — Phase 3 — production deploy (Vercel)
- **Time:** 0.5h
- **Phase:** phase-3-demo
- **Milestone:** Production deployment to Vercel (`zero-to-ct-storefront.vercel.app`); env vars synced; post-deploy smoke test passed (health, pages, guest wishlist add/move-to-cart, checkout session).
- **Agent vs manual:** ~70% agent / 30% human (Vercel auth, env approval)
- **Notes:** Add production URL to Stripe connector `ALLOWED_ORIGINS` if checkout CORS errors appear. GitHub↔Vercel auto-connect optional follow-up.

