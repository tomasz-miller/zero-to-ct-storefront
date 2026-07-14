# Agent Instructions

Quick entry point for AI coding agents working in this repository.

**Read first:** [docs/AGENT_CODING.md](docs/AGENT_CODING.md) · [docs/TECH_STACK.md](docs/TECH_STACK.md) · [docs/UI_COMPONENTS.md](docs/UI_COMPONENTS.md) · [docs/TESTING.md](docs/TESTING.md)

**UI skill:** `.agents/skills/coss/SKILL.md` — use coss primitives for all UI; `pnpm dlx shadcn@latest add @coss/<component>`

## Project

Minimal B2C storefront on commercetools — agent-assisted, backend-developer-led PoC.

**Live demo:** https://zero-to-ct-storefront.vercel.app/

## Hard rules

1. **pnpm only** — never npm or yarn; commit `pnpm-lock.yaml`
2. Run **`pnpm lint`**, **`pnpm typecheck`**, and **`pnpm test:unit`** before finishing a task
3. **Never** expose commercetools credentials to the client bundle
4. Use **TypeScript SDK v3** (`ClientBuilder` pattern) — [getting started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started)
5. Validate API calls via **commercetools-knowledge** MCP
6. UI fetches data through **BFF routes** (`/app/api/`), not direct CT calls from browser
7. Public documentation is **English only**
8. Update **BUILD_LOG.md** after each meaningful milestone

## Cursor rules

Rules in `.cursor/rules/` apply automatically:

- `project-overview.mdc` — always on
- `commercetools-bff.mdc` — `app/api/`, `lib/commercetools/`
- `nextjs-ui.mdc` — `app/`, `components/`
- `toolchain.mdc` — `package.json`, ESLint, tsconfig

## MCP

`commercetools-knowledge` is configured in `.cursor/mcp.json`. Use it before writing CT API code.
