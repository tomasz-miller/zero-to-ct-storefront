# Agent Instructions

Quick entry point for AI coding agents working in this repository.

**Read first:** [docs/AGENT_CODING.md](docs/AGENT_CODING.md)

## Project

Minimal B2C storefront on commercetools — agent-assisted, backend-developer-led PoC.

## Hard rules

1. **Never** expose commercetools credentials to the client bundle
2. Use **TypeScript SDK v3** and validate API calls via **commercetools-knowledge** MCP
3. UI fetches data through **BFF routes** (`/app/api/`), not direct CT calls from browser
4. Public documentation is **English only**
5. Update **BUILD_LOG.md** after each meaningful milestone

## Cursor rules

Rules in `.cursor/rules/` apply automatically:

- `project-overview.mdc` — always on
- `commercetools-bff.mdc` — `app/api/`, `lib/commercetools/`
- `nextjs-ui.mdc` — `app/`, `components/`

## MCP

`commercetools-knowledge` is configured in `.cursor/mcp.json`. Use it before writing CT API code.
