# Time report

End-of-project time summary for **zero-to-ct-storefront** sales demos. Derived from [BUILD_LOG.md](../BUILD_LOG.md) and **git commit timestamps**.

> **Status:** Estimated from commits (2026-07-10). Refine with Clockify/WakaTime if available.

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

### Daily totals

| Date | Calculation | Net hours |
|------|-------------|-----------|
| 2026-07-08 | Full day: morning MC/docs (no commits) + afternoon commits 13:26–16:00 → 9:00–17:00 minus 1h lunch | **7h** |
| 2026-07-09 | No commits; BUILD_LOG Stripe/Connect/MC manual work → full day estimate | **7h** |
| 2026-07-10 | Partial day: first commit 12:52 (post-lunch) through ~17:00 incl. Phase 3 docs/tests | **4h** |
| **Total** | | **18h** |

---

## Summary

| Metric | Value |
|--------|-------|
| Project duration | 3 working days (2026-07-08 → 2026-07-10) |
| Total estimated time | **18h** net |
| Current phase | phase-2-core complete; phase-3-demo in progress |
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
| **Total** | | | ~80% agent / ~20% manual | **18h** |

---

## Hours by phase

| Phase | Hours | Share |
|-------|-------|-------|
| phase-0-setup | 2.5h | 14% |
| phase-1-scaffold | 2h | 11% |
| phase-2-core | 12h | 67% |
| phase-3-demo | 1.5h | 8% |
| **Total** | **18h** | 100% |

---

## Deliverables checklist

| Deliverable | Status |
|-------------|--------|
| Working B2C storefront (browse → cart → checkout → account) | Done |
| Customer authentication + order history | Done |
| Unit tests (CI) | Done |
| E2E discovery + cart/checkout (local) | Done |
| Sales demo script | Done — [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) |
| Product roadmap | Done — [ROADMAP.md](./ROADMAP.md) |
| Deploy to Vercel/Netlify | Pending (human) — [DEPLOY.md](./DEPLOY.md) |
| This time report | Estimated from commits |

---

## Caveats

- **2026-07-09** has no git commits; 7h is inferred from BUILD_LOG (Stripe connector, Checkout Applications, MC configuration).
- **2026-07-10** total may increase if work continues past 17:00 or if morning activity is added.
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
