# zero-to-ct-storefront

A minimal B2C storefront on [commercetools](https://commercetools.com) Composable Commerce — built by a backend developer in ~2 weeks using AI agents and official CT tooling.

## Status

🚧 **Work in progress** — PoC for agent-assisted commerce delivery.

## Documentation

| Doc | Description |
|-----|-------------|
| [AGENTS.md](./AGENTS.md) | Quick reference for AI coding agents |
| [docs/AGENT_CODING.md](./docs/AGENT_CODING.md) | Full agent-assisted development guide |
| [docs/CURSOR_SETUP.md](./docs/CURSOR_SETUP.md) | `.cursor/` directory setup (rules, MCP) |
| [BUILD_LOG.md](./BUILD_LOG.md) | Chronological development log |

## Stack (planned)

- Next.js (App Router) + TypeScript
- commercetools TypeScript SDK v3
- Tailwind CSS
- commercetools Checkout Browser SDK
- B2C sample data (Lifestyle and Home)

## Development

1. Install [commercetools AI plugin](https://github.com/commercetools/commercetools-ai-plugins) in Cursor
2. Set up `.cursor/` — see [docs/CURSOR_SETUP.md](./docs/CURSOR_SETUP.md)
3. Copy `.env.example` → `.env.local` and add CT API credentials
4. Run `/nextjs-setup-project` (CT AI plugin command)

## License

See [LICENSE](./LICENSE).
