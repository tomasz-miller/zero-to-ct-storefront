# Time report

End-of-project time summary for **zero-to-ct-storefront** sales demos. Derived from [BUILD_LOG.md](../BUILD_LOG.md) and **git commit timestamps**.

> **Status:** Estimated from BUILD_LOG + user-reported time (2026-07-13). Refine with Clockify/WakaTime if available.

---

## Methodology

| Rule | Value |
|------|-------|
| Working window | 09:00–17:00 |
| Lunch (deducted daily) | 1h (assumed 12:00–13:00) |
| Net capacity per full day | **7h** |
| Data source | `git log --format='%ai'` (author: Tomasz Miller) |

**Per-day logic:**

1. **Day with commits** — estimate from first/last commit, capped at 7h net. If commits span only part of the window, use that span (lunch already passed when afternoon commits start).
2. **Day in BUILD_LOG without commits** — estimate as full 7h when milestone describes substantive manual work (e.g. Merchant Center / Stripe on 2026-07-09).
3. **Milestone hours** — split each day's total proportionally across BUILD_LOG entries for that date.

### Commit activity

| Date | First commit | Last commit | Commits |
|------|--------------|-------------|---------|
| 2026-07-08 | 13:26 | 16:00 | 8 |
| 2026-07-09 | — | — | 0 (MC/Stripe setup per BUILD_LOG) |
| 2026-07-10 | 12:52 | 14:50+ | 5 (+ uncommitted Phase 3 work) |
| 2026-07-13 | — | — | 0 (Phase 4 discovery slices per BUILD_LOG; user-reported 3.5h) |

### Daily totals

| Date | Calculation | Net hours |
|------|-------------|-----------|
| 2026-07-08 | Full day: morning MC/docs (no commits) + afternoon commits 13:26–16:00 → 9:00–17:00 minus 1h lunch | **7h** |
| 2026-07-09 | No commits; BUILD_LOG Stripe/Connect/MC manual work → full day estimate | **7h** |
| 2026-07-10 | Partial day: first commit 12:52 (post-lunch) through ~17:00 incl. Phase 3 docs/tests | **4h** |
| 2026-07-13 | Phase 4 discovery slices incl. facets + autocomplete (user-reported) | **3.5h** |
| 2026-07-14 | Checkout cart-session cleanup and review fixes | **0.25h** |
| 2026-07-14 | Phase 5 slice 2 — profile edit, address CRUD, change password; 170 unit + 21 E2E tests | **1.5h** |
| 2026-07-14 | Account UX polish — dismissible alerts, address dialog, wide-screen account layout | **40min** |
| 2026-07-14 | Phase 6 wishlist — shopping lists, BFF, UI, tests | **1.5h** |
| 2026-07-14 | Phase 3 production deploy — Vercel env sync + smoke test | **0.5h** |
| **Total** | | **25.92h** |

---

## Summary

| Metric | Value |
|--------|-------|
| Project duration | 5 working days (2026-07-08 → 2026-07-14) |
| Total estimated time | **25.92h** net |
| Current phase | phase-3-demo done; phase-6-wishlist done |
| Developer profile | Backend-focused, agent-assisted (Cursor + commercetools AI plugin) |
| Agent contribution | ~85–95% of storefront code; human owns CT project, Stripe/Connect, MC config |

---

## Milestones by phase

| Phase | Date | Milestone | Agent vs manual | Time |
|-------|------|-----------|-----------------|------|
| phase-0-setup | 2026-07-08 | Repository bootstrap; agent docs, TECH_STACK, CURSOR_SETUP | Agent docs; human GitHub repo | 1h |
| phase-0-setup | 2026-07-08 | CT demo project + API client; Product Search enabled; `.env` files; coss skill | Human — MC setup, credentials | 1.5h |
| phase-1-scaffold | 2026-07-08 | Next.js scaffold; CT SDK; `/api/health`, `/api/products`; homepage (117 products) | ~85% agent / 15% human | 2h |
| phase-2-core | 2026-07-08 | Discovery: `/search`, `/product/[slug]`, homepage bestsellers | ~90% agent | 1.5h |
| phase-2-core | 2026-07-08 | Test suite: 34 unit + 5 E2E (discovery) | ~95% agent | 1h |
| phase-2-core | 2026-07-09 | Stripe Checkout MC setup + guest cart/checkout BFF + pages | Human Stripe/MC; agent storefront | 7h |
| phase-2-core | 2026-07-10 | Checkout payment fix (`no_payment_integrations`) | Agent + manual payment test | 0.5h |
| phase-2-core | 2026-07-10 | Customer auth, account page, cart merge | ~95% agent | 1.5h |
| phase-2-core | 2026-07-10 | Product roadmap (`docs/ROADMAP.md`) | ~95% agent | 0.5h |
| phase-3-demo | 2026-07-10 | E2E cart/checkout, demo script, time report, deploy docs | ~95% agent | 1.5h |
| phase-3-demo | 2026-07-14 | Vercel production deploy + smoke test | ~70% agent / 30% human | 0.5h |
| phase-4-discovery | 2026-07-13 | Category module, CLP, header nav, New Arrivals, custom 404; code review fixes; unified product listing cards; 95 unit + 12 E2E tests | ~95% agent | 2h |
| phase-4-discovery | 2026-07-13 | Listing sort + pagination on `/search` and `/category/[slug]`; code-review hardening; 110+ unit + 13 E2E tests | ~95% agent | 1h |
| phase-4-discovery | 2026-07-13 | Faceted filters + search autocomplete; 128 unit + 15 E2E tests | ~95% agent | 0.5h |
| phase-2-core | 2026-07-14 | Checkout completion cart-session cleanup; prevent false badge reset on failed cleanup; duplicate-event guard; unit coverage | ~95% agent | 0.25h |
| phase-5-account | 2026-07-14 | Phase 5 slice 1 — order detail + extended profile | ~95% agent | 1h |
| phase-5-account | 2026-07-14 | Phase 5 slice 2 — profile edit, address CRUD, change password; 170 unit + 21 E2E tests | ~95% agent | 1.5h |
| phase-5-account | 2026-07-14 | Account UX polish — dismissible alerts (auto-dismiss + close), address add/edit dialog, responsive wide-screen layout on `/account` | ~95% agent | 40min |
| phase-6-wishlist | 2026-07-14 | Phase 6 — shopping lists, BFF, UI, move-to-cart, guest merge; 183 unit + 24 E2E tests | ~95% agent | 1.5h |
| **Total** | | | ~80% agent / ~20% manual | **25.92h** |

---

## Hours by phase

| Phase | Hours | Share |
|-------|-------|-------|
| phase-0-setup | 2.5h | 10% |
| phase-1-scaffold | 2h | 8% |
| phase-2-core | 12.25h | 51% |
| phase-3-demo | 2h | 8% |
| phase-4-discovery | 3.5h | 14% |
| phase-5-account | 3.17h | 12% |
| phase-6-wishlist | 1.5h | 6% |
| **Total** | **25.92h** | 100% |

---

## Deliverables checklist

| Deliverable | Status |
|-------------|--------|
| Working B2C storefront (browse → cart → checkout → account) | Done |
| Category navigation + Category Listing Page (`/category/[slug]`) | Done |
| Homepage New Arrivals section | Done |
| Search / category sort + pagination | Done |
| Faceted filters + search autocomplete | Done |
| Custom `not-found` page | Done |
| Customer authentication + order history | Done |
| Account profile edit + address CRUD + change password | Done |
| Account UX polish (dismissible alerts, wide-screen layout) | Done |
| Wishlist (heart icon, `/wishlist`, move to cart) | Done |
| Unit tests (CI) — 183 tests | Done |
| E2E discovery + cart/checkout + account + wishlist (local) — 24 tests | Done |
| Sales demo script | Done — [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) |
| Product roadmap | Done — [ROADMAP.md](./ROADMAP.md) |
| Deploy to Vercel/Netlify | Done — https://zero-to-ct-storefront.vercel.app ([DEPLOY.md](./DEPLOY.md)) |
| This time report | Estimated from commits |

---

## Caveats

- **2026-07-13** has no git commits yet; 3.5h is user-reported for Phase 4 category discovery slice (2h), listing sort/pagination slice 2a (1h), and facets + autocomplete slice 2b+2c (0.5h); see BUILD_LOG.
- **2026-07-09** has no git commits; 7h is inferred from BUILD_LOG (Stripe connector, Checkout Applications, MC configuration).
- **2026-07-10** total may increase if work continues past 17:00 or if morning activity is added.
- **2026-07-14** includes 0.25h checkout cart-session cleanup, 1.5h Phase 5 slice 2, 40min account UX polish, 1.5h Phase 6 wishlist, and 0.5h Vercel production deploy.
- Milestone split within a day is approximate; use Clockify/WakaTime for audit-grade numbers.

### How to refine

1. Export time entries from **Clockify** or **WakaTime** tagged with phase labels.
2. Replace daily totals in the methodology table.
3. Re-split milestone rows to match tracked entries.

---

## Related docs

- [BUILD_LOG.md](../BUILD_LOG.md) — chronological dev log (source of truth)
- [AGENT_CODING.md](./AGENT_CODING.md) — agent workflow and phase plan
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — sales demo scenarios
