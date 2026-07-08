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
- **Milestone:** `/search` with `?q=` full-text search; `/product/[slug]` PDP; homepage compact best-seller tiles via `listBestSellingProducts()` (excludes new-arrival products/category; oldest-first). Locale fixed to `en-GB` for B2C sample data.
- **Agent vs manual:** ~90% agent
- **Notes:** Orders API unavailable without `view_orders` scope — bestsellers use catalog heuristic instead
