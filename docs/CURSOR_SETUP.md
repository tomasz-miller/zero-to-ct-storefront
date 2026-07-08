# Cursor & Agent Setup

This file documents the `.cursor/` directory structure for this repo.  
**Plan mode note:** Copy these files into place when executing the bootstrap (or ask the agent in Agent mode to create them).

---

## Directory structure

```
.cursor/
├── mcp.json
└── rules/
    ├── project-overview.mdc
    ├── commercetools-bff.mdc
    ├── nextjs-ui.mdc
    └── toolchain.mdc           # pnpm, ESLint, SDK reference
```

Also create at repo root: `.env.example` (see bottom of this file).

---

## `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "commercetools-knowledge": {
      "type": "http",
      "url": "https://docs.commercetools.com/apis/mcp"
    }
  }
}
```

---

## `.cursor/rules/project-overview.mdc`

```markdown
---
description: Core project context and agent-assisted development principles
alwaysApply: true
---

# zero-to-ct-storefront

Minimal B2C storefront on commercetools Composable Commerce. Built agent-assisted by a backend-focused developer.

## Architecture

- **Next.js App Router** with API Routes as BFF (Backend for Frontend)
- **pnpm only** — never npm or yarn; see `docs/TECH_STACK.md`
- **ESLint** (`eslint-config-next`) + TypeScript `strict`
- **commercetools TypeScript SDK v3** per [official getting started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started)
- Packages: `@commercetools/ts-client`, `@commercetools/platform-sdk`, `@commercetools/checkout-sdk`
- **Server-side only** for CT credentials — never expose secrets to the client bundle
- **Product Search API** for discovery; Cart API for basket; Checkout Browser SDK for payments

## Division of labour (human vs agent)

| Layer | Owner | Agent role |
|-------|-------|------------|
| BFF / API routes (`app/api/`) | Human reviews all code | Agent drafts, human validates |
| CT SDK client (`lib/commercetools/`) | Human reviews | Agent scaffolds from CT skills |
| UI components (`components/`, `app/**/*.tsx`) | Agent generates | Human tests flows, not pixel-perfect UI |
| Docs (`docs/`, `BUILD_LOG.md`) | Human | English only for public docs |

## Before generating CT API code

1. Search docs via **commercetools-knowledge** MCP
2. Validate queries with `commercetools-rest-validate` or `commercetools-graphql-validate`
3. Read `commercetools-developer-tips` prompt for conventions (key vs id, centAmount, locales)

## Scope discipline

- PoC only — no premature optimisation (caching layers, complex state management)
- Functional UI over polished design
- One feature per agent session; update `BUILD_LOG.md` after each milestone
```

---

## `.cursor/rules/commercetools-bff.mdc`

```markdown
---
description: commercetools API and BFF conventions for server-side code
globs: "{app/api/**,lib/commercetools/**}/**/*.{ts,tsx}"
alwaysApply: false
---

# commercetools BFF conventions

Follow [TS SDK getting started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started) and `docs/TECH_STACK.md`.

## SDK client (v3, Promise-based, ClientBuilder)

```typescript
import { ClientBuilder, type AuthMiddlewareOptions, type HttpMiddlewareOptions } from '@commercetools/ts-client';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

// Auth + HTTP middleware with httpClient: fetch
// .withClientCredentialsFlow() → .withHttpMiddleware() → .withLoggerMiddleware() → .build()
// apiRoot = createApiBuilderFromCtpClient(client).withProjectKey({ projectKey })
```

Env vars: `CTP_PROJECT_KEY`, `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`, `CTP_AUTH_URL`, `CTP_API_URL`, `CTP_SCOPES`.

## API conventions

- Use **keys** in URLs where possible; reserve **ids** for resource references
- Money: always `centAmount` + `currencyCode` — never floats
- Localized strings: match project locales
- Carts: create lazily (on first add-to-cart), not on page load
- Handle `409` with `withConcurrentModificationMiddleware()`

## Do not

- Import CT client in `'use client'` components
- Use deprecated SDK v2 or `.defaultClient()` browser patterns on server
- Use npm/yarn — **pnpm only**
```

---

## `.cursor/rules/nextjs-ui.mdc`

```markdown
---
description: Next.js UI patterns for agent-generated frontend code
globs: "{app/**,components/**}/**/*.{tsx,jsx}"
alwaysApply: false
---

# Next.js UI patterns

- Fetch data from **BFF routes** (`/api/*`), not directly from commercetools
- Prefer Server Components; `'use client'` only for interactivity
- Tailwind utility classes — functional, minimal UI
- Always include basic loading/error states

## PoC routes

`/`, `/search`, `/product/[slug]`, `/cart`, `/checkout`, `/order-confirmation`
```

---

## `.cursor/rules/toolchain.mdc`

```markdown
---
description: Package manager, linting, and quality gates
globs: "{package.json,pnpm-lock.yaml,eslint.config.*,tsconfig.json}"
alwaysApply: false
---

# Toolchain

- **pnpm only** — never `npm install` or `yarn add`
- Run `pnpm lint` and `pnpm typecheck` before committing
- Node >= 22, packageManager pinned in package.json
- ESLint: eslint-config-next (flat config)
- Reference: docs/TECH_STACK.md
```

---

## `.env.example`

```bash
# commercetools Composable Commerce — copy to .env.local
CTP_PROJECT_KEY=
CTP_CLIENT_ID=
CTP_CLIENT_SECRET=
CTP_AUTH_URL=https://auth.europe-west1.gcp.commercetools.com
CTP_API_URL=https://api.europe-west1.gcp.commercetools.com
CTP_CHECKOUT_URL=https://checkout.europe-west1.gcp.commercetools.com
CTP_SCOPES=manage_project:your-project-key

NEXT_PUBLIC_DEFAULT_LOCALE=en-GB
NEXT_PUBLIC_DEFAULT_CURRENCY=GBP
```

---

## Quick setup commands

```bash
mkdir -p .cursor/rules
corepack enable
# Create mcp.json and .mdc files using content above
cp .env.example .env.local
pnpm install   # after package.json exists
pnpm lint && pnpm typecheck
```

See also: [AGENT_CODING.md](./AGENT_CODING.md)
