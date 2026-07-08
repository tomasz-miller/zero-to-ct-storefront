# Tech Stack

Canonical technology choices for **zero-to-ct-storefront**. Agents and humans must follow this document when scaffolding or adding dependencies.

> Reference: [Get started with the TypeScript SDK](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started)

---

## Runtime & package manager

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | `>= 22` (LTS) | CT AI plugin requirement; SDK requires `>= 18.17` |
| **pnpm** | `10.x` | **Only** package manager — do not use npm or yarn |

### pnpm enforcement

When scaffolding, always use pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
```

Required repo files (created during Phase 1 scaffold):

**`package.json`** — pin package manager:

```json
{
  "packageManager": "pnpm@10.12.4",
  "engines": {
    "node": ">=22",
    "pnpm": ">=10"
  }
}
```

**`.npmrc`**:

```ini
engine-strict=true
auto-install-peers=true
```

**`.gitignore`** — ensure `node_modules`, `.pnpm-store`, `pnpm-lock.yaml` is **committed** (lockfile must be in git).

---

## Application framework

| Tool | Choice |
|------|--------|
| Framework | **Next.js** (App Router, latest stable) |
| Language | **TypeScript** (`strict: true` in `tsconfig.json`) |
| Styling | **Tailwind CSS v4** |
| UI components | **[coss ui](https://coss.com/ui)** via `pnpm dlx shadcn@latest add @coss/*` |
| Linting | **ESLint** with `eslint-config-next` (flat config) |
| Formatting | **Prettier** (optional but recommended for agent-generated code) |

### ESLint

Use the Next.js ESLint setup created by `create-next-app` (ESLint 9 flat config):

```
eslint.config.mjs    # eslint-config-next + typescript-eslint
```

**Scripts in `package.json`:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

Run before every commit: `pnpm lint && pnpm typecheck`

### coss ui

All customer-facing UI uses **coss** primitives — see [docs/UI_COMPONENTS.md](./UI_COMPONENTS.md).

```bash
# After Next.js scaffold
pnpm dlx shadcn@latest init @coss/style
# or: pnpm dlx shadcn@latest add @coss/ui @coss/colors-neutral
```

Agent skill: `.agents/skills/coss/SKILL.md`

### Prettier (recommended)

```bash
pnpm add -D prettier eslint-config-prettier
```

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all"
}
```

---

## commercetools TypeScript SDK (v3)

Use the **current v3 Promise-based client** — v2 is [deprecated since October 2024](https://docs.commercetools.com/api/releases/2024-10-30-typescript-sdk-v2-client-is-now-deprecated).

### Install (pnpm)

```bash
# HTTP API (products, carts, orders, customers)
pnpm add @commercetools/ts-client @commercetools/platform-sdk

# Checkout API (checkout sessions — Phase 2)
pnpm add @commercetools/checkout-sdk
```

Do **not** install deprecated v2 packages or use `.defaultClient()` browser patterns on the server.

### SDK client layout

```
lib/commercetools/
├── client.ts          # ClientBuilder — HTTP API
├── checkout-client.ts # ClientBuilder — Checkout API (separate host)
├── api-root.ts        # createApiBuilderFromCtpClient + withProjectKey
└── env.ts             # Validated env vars (server-only)
```

### HTTP API client (`lib/commercetools/client.ts`)

Follow the [official getting started guide](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started#create-the-client):

```typescript
import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/ts-client';

const projectKey = process.env.CTP_PROJECT_KEY!;
const scopes = [process.env.CTP_SCOPES!];

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: process.env.CTP_AUTH_URL!,
  projectKey,
  credentials: {
    clientId: process.env.CTP_CLIENT_ID!,
    clientSecret: process.env.CTP_CLIENT_SECRET!,
  },
  scopes,
  httpClient: fetch,
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: process.env.CTP_API_URL!,
  httpClient: fetch,
};

export const ctpClient = new ClientBuilder()
  .withProjectKey(projectKey)
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .withLoggerMiddleware()
  .build();
```

### API root (`lib/commercetools/api-root.ts`)

```typescript
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { ctpClient } from './client';
import { projectKey } from './env';

export const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({
  projectKey,
});
```

### Recommended middleware (add after smoke test)

From [SDK middleware docs](https://docs.commercetools.com/dev-tooling/ts-sdk-middleware):

- `withConcurrentModificationMiddleware()` — auto-retry on `409` for cart updates
- `withCorrelationIdMiddleware()` — request tracing in logs

### Checkout API client

Separate `ClientBuilder` with Checkout API host (`https://checkout.{region}.commercetools.com`). Use `@commercetools/checkout-sdk` for session/transaction calls. See [Checkout SDK getting started](https://docs.commercetools.com/dev-tooling/ts-sdk-getting-started#create-the-client).

---

## Checkout (browser)

| Package | Purpose |
|---------|---------|
| `@commercetools/checkout-browser-sdk` | Embed checkout UI in `/checkout` page |

Checkout session creation stays in **BFF** (`app/api/checkout-session/`); only `sessionId` goes to the browser.

---

## Environment variables

See `.env.example`. Region-specific hosts from [API hosts reference](https://docs.commercetools.com/api/general-concepts#hosts).

| Variable | Example (EU GCP) |
|----------|------------------|
| `CTP_AUTH_URL` | `https://auth.europe-west1.gcp.commercetools.com` |
| `CTP_API_URL` | `https://api.europe-west1.gcp.commercetools.com` |
| `CTP_CHECKOUT_URL` | `https://checkout.europe-west1.gcp.commercetools.com` |

---

## Agent scaffolding checklist

When running `/nextjs-setup-project` or manual scaffold, verify:

- [ ] `packageManager` set to pnpm in `package.json`
- [ ] `pnpm-lock.yaml` committed
- [ ] ESLint config present and `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] SDK client matches official `ClientBuilder` pattern (not v2 / not browser UMD)
- [ ] `@commercetools/ts-client` + `@commercetools/platform-sdk` installed via pnpm
- [ ] No `npm install` or `yarn add` in docs, scripts, or CI

---

## CI (Phase 3 — Vercel / GitHub Actions)

```yaml
# Minimal GitHub Actions job
- run: corepack enable && pnpm install --frozen-lockfile
- run: pnpm lint
- run: pnpm typecheck
- run: pnpm build
```
