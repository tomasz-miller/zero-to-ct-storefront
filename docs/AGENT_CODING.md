# Agent-Assisted Coding Guide

This document describes how to develop **zero-to-ct-storefront** using AI coding agents (Cursor + commercetools AI plugin). It is the canonical reference for anyone — human or agent — working in this repository.

> **Language policy:** All public documentation in this repo is written in **English**. Commit messages and code comments may be in English for consistency.

---

## Goals

1. Deliver a working B2C storefront on commercetools sample data in ~2 weeks
2. Demonstrate **agent-assisted delivery** by a backend-focused developer
3. Produce measurable evidence (time logs, git history) for sales demos

**Live demo:** https://zero-to-ct-storefront.vercel.app/

---

## Toolchain

| Tool | Purpose | Required |
|------|---------|----------|
| [Cursor](https://cursor.com) | IDE with AI agents | Yes |
| [commercetools AI plugin](https://github.com/commercetools/commercetools-ai-plugins) | Skills + scaffolding commands | Yes |
| **commercetools-knowledge MCP** | Live docs, schema lookup, query validation | Yes (configured in `.cursor/mcp.json`) |
| **pnpm** | Package manager (**only** — no npm/yarn) | Yes |
| **ESLint** | Linting (`eslint-config-next`) | Yes |
| **TypeScript** | `strict` mode | Yes |
| [TypeScript SDK v3](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started) | CT API client | Yes |
| **[coss ui](https://coss.com/ui)** | UI primitives (skill in `.agents/skills/coss/`) | Yes |
| **commerce-mcp** | Live project API calls from agents | Optional IDE/ops tooling — not storefront scope |
| WakaTime / Clockify | Time tracking | Recommended |

Full stack details: **[docs/TECH_STACK.md](./TECH_STACK.md)**

### Install commercetools AI plugin (Cursor)

1. Cursor → **Settings → Plugins**
2. **Install from Git URL:** `https://github.com/commercetools/commercetools-ai-plugins`
3. Verify Knowledge MCP responds (ask agent to search CT docs)

### Key plugin commands

| Command | When to use |
|---------|-------------|
| `/nextjs-setup-project` | Initial scaffold (SDK, auth, App Router structure) |
| `/deploy-vercel` | Deploy with safety checks |
| `/deploy-netlify` | Alternative deployment |

---

## Repository layout

```
zero-to-ct-storefront/
├── .cursor/
│   ├── mcp.json              # MCP server config (committed)
│   └── rules/                # Cursor rules for agents (committed)
├── app/                      # Next.js App Router
│   ├── api/                  # BFF — server-side CT integration
│   └── ...                   # Pages
├── components/               # React UI (agent-generated, human-tested)
├── lib/commercetools/        # SDK client, helpers (human-reviewed)
├── docs/
│   ├── AGENT_CODING.md       # This file
│   ├── TECH_STACK.md         # pnpm, ESLint, TS SDK v3 conventions
│   ├── CURSOR_SETUP.md       # .cursor/ bootstrap
│   ├── CHECKOUT.md           # Stripe connector + Checkout MC/Connect setup
│   ├── DEMO_SCRIPT.md        # Sales demo script
│   ├── DEPLOY.md             # Vercel deployment guide
│   ├── ROADMAP.md            # Product roadmap
│   └── TIME_REPORT.md        # End-of-project time summary
├── BUILD_LOG.md              # Chronological dev log (human-maintained)
├── .env.example              # Env var template (no secrets)
└── .env.local                # Local secrets (gitignored)
```

---

## Development workflow

### 1. Start a session

1. Open `BUILD_LOG.md` — note today's goal
2. Start Clockify timer with phase tag (e.g. `phase-2-cart`)
3. Open relevant Cursor rule context (rules auto-apply by file type)

### 2. Prompt the agent effectively

**Do** — be specific, reference CT APIs:

```
Add a BFF route GET /api/products that uses Product Search API
with limit=12, locale from query param, and returns id, name, slug, price.
Validate the query with commercetools-knowledge MCP first.
```

**Don't** — vague prompts:

```
Make a product page.
```

### 3. Review checklist (human, every PR-sized chunk)

- [ ] **pnpm only** — no `package-lock.json` or `yarn.lock`; `pnpm-lock.yaml` updated
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] CT credentials only in server code / env vars
- [ ] SDK v3 `ClientBuilder` pattern per [TS SDK getting started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started)
- [ ] Money as `centAmount`, locales handled correctly
- [ ] API route returns proper HTTP status codes
- [ ] Manual test: `curl localhost:3000/api/...` works
- [ ] Knowledge MCP validation passed for new CT queries

### 4. End a session

1. Update `BUILD_LOG.md` (date, hours, milestone, agent vs manual %)
2. Commit with descriptive message
3. Stop timer

---

## Role split: backend developer + agent

This project is intentionally built by a **backend developer** with agent support:

| Task | Who |
|------|-----|
| CT project setup, API clients, scopes | Human |
| BFF routes, SDK client, error handling | Agent drafts → **human reviews** |
| React pages and components (coss ui) | **Agent generates** using coss skill → human tests flows |
| Checkout / PSP configuration in MC | Human |
| Architecture decisions | Human |
| Documentation | Human outlines → agent drafts → human edits |

The agent is not a substitute for reviewing commerce logic. Every cart, price, and checkout path must be manually verified against the commercetools Merchant Center.

---

## commercetools conventions (quick reference)

Always verify against [commercetools docs](https://docs.commercetools.com) via Knowledge MCP:

| Topic | Convention |
|-------|------------|
| Identifiers | Prefer `key` for config; `id` for resource references |
| Money | `centAmount` (integer) + `currencyCode` |
| Localized text | `LocalizedString` — match project locales |
| Search | Product Search API (not Projection Search for new code) |
| Carts | Create on first add-to-cart, not on homepage load |
| Auth | OAuth client credentials; server-side only |

---

## Phase plan

| Phase | Focus | BUILD_LOG tag |
|-------|-------|---------------|
| 0 | CT trial, sample data, API client, env files | `phase-0-setup` ✅ |
| 1 | `/nextjs-setup-project` with **pnpm**, SDK smoke test | `phase-1-scaffold` ✅ |
| 2 | Discovery, cart, checkout, auth | `phase-2-core` ✅ |
| 3 | Deploy, demo script, TIME_REPORT, E2E cart/checkout | `phase-3-demo` ✅ |

---

## What not to build in this PoC

- commercetools Frontend (separate licensed product)
- Merchant Center Custom Applications (admin UI, not storefront)
- Voice / image search (separate initiative)
- Production-grade caching, i18n, or design system
- Commerce MCP / shopping assistant (out of storefront scope — IDE/ops tooling only)

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in values from Merchant Center → Settings → Developer settings → API clients.

Never commit `.env.local` or any file containing secrets.

---

## Further reading

- [Product roadmap (this repo)](./ROADMAP.md)
- [Sales demo script](./DEMO_SCRIPT.md)
- [Deployment guide](./DEPLOY.md)
- [Time report](./TIME_REPORT.md)
- [Tech stack (this repo)](./TECH_STACK.md)
- [TypeScript SDK — Get started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started)
- [TypeScript SDK — Middleware](https://docs.commercetools.com/dev-tooling/ts-sdk-middleware)
- [commercetools AI plugin overview](https://docs.commercetools.com/dev-tooling/build-with-ai-overview)
- [Knowledge MCP](https://docs.commercetools.com/sdk/mcp/knowledge-mcp)
- [Demo flow B2C Retail](https://docs.commercetools.com/tutorials/implementation-guide/demo-flow-b2c-retail)
- [Prepare for agentic commerce](https://docs.commercetools.com/learning-prepare-for-agentic-commerce)
