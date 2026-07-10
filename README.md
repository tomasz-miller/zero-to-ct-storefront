# zero-to-ct-storefront

A minimal B2C storefront on [commercetools](https://commercetools.com) Composable Commerce — built by a backend developer in ~2 weeks using AI agents and official CT tooling.

## Status

🚧 **Work in progress** — PoC for agent-assisted commerce delivery.

## Documentation

| Doc | Description |
|-----|-------------|
| [AGENTS.md](./AGENTS.md) | Quick reference for AI coding agents |
| [docs/AGENT_CODING.md](./docs/AGENT_CODING.md) | Full agent-assisted development guide |
| [docs/TECH_STACK.md](./docs/TECH_STACK.md) | pnpm, ESLint, TypeScript SDK v3 |
| [docs/UI_COMPONENTS.md](./docs/UI_COMPONENTS.md) | coss ui primitives and conventions |
| [docs/CURSOR_SETUP.md](./docs/CURSOR_SETUP.md) | `.cursor/` directory setup (rules, MCP) |
| [docs/CHECKOUT.md](./docs/CHECKOUT.md) | Checkout + Stripe connector (MC, Connect, API client scopes) |
| [BUILD_LOG.md](./BUILD_LOG.md) | Chronological development log |

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js `>= 22` |
| Package manager | **pnpm** `10.x` |
| Framework | Next.js (App Router) + TypeScript `strict` |
| Linting | ESLint (`eslint-config-next`) |
| Commerce API | [@commercetools/ts-client](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started) + `@commercetools/platform-sdk` v3 |
| Checkout | `@commercetools/checkout-sdk` + Checkout Browser SDK |
| UI | [coss ui](https://coss.com/ui) (Tailwind v4 + Base UI) |
| Data | B2C sample data (Lifestyle and Home) |

## Development

```bash
corepack enable
pnpm install
cp .env.example .env.local   # add CT credentials
pnpm dev
pnpm lint && pnpm typecheck
```

1. Install [commercetools AI plugin](https://github.com/commercetools/commercetools-ai-plugins) in Cursor
2. Set up `.cursor/` — see [docs/CURSOR_SETUP.md](./docs/CURSOR_SETUP.md)
3. Run `/nextjs-setup-project` (CT AI plugin) — **specify pnpm**

## License

See [LICENSE](./LICENSE).
