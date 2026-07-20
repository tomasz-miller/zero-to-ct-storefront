# Deployment guide

How to deploy **zero-to-ct-storefront** to production (Vercel recommended).

**Production path:** the GitHub repo is linked to Vercel — pushes to `main` **auto-deploy**. Initial project import, env vars, and Stripe connector `ALLOWED_ORIGINS` remain a one-time human setup. CLI / plugin deploy is optional for first-time bootstrap or emergency redeploys.

---

## Prerequisites

- commercetools demo or trial project with Checkout + Stripe connector configured ([CHECKOUT.md](./CHECKOUT.md))
- GitHub repository pushed to remote
- Vercel account (or Netlify alternative)

---

## Automatic deploys (production)

Once the Vercel project is connected to the GitHub repository:

1. Push (or merge) to **`main`**.
2. Vercel builds with `pnpm install --frozen-lockfile` / `pnpm build` and promotes Production.
3. Smoke-check `/api/health` after the deployment finishes (see [Post-deploy checklist](#post-deploy-checklist)).

Preview deployments for pull requests are optional and use the same env var set (Preview scope in the Vercel dashboard).

---

## Required environment variables

Copy from [`.env.example`](../.env.example). Set these in the hosting provider (Vercel → Settings → Environment Variables):

### Server-only (never expose to client bundle logic incorrectly)

| Variable | Description |
|----------|-------------|
| `CTP_PROJECT_KEY` | Project key |
| `CTP_CLIENT_ID` | Storefront BFF API client ID |
| `CTP_CLIENT_SECRET` | Storefront BFF API client secret |
| `CTP_AUTH_URL` | `https://auth.europe-west1.gcp.commercetools.com` (EU GCP) |
| `CTP_API_URL` | `https://api.europe-west1.gcp.commercetools.com` |
| `CTP_SESSION_URL` | `https://session.europe-west1.gcp.commercetools.com` |
| `CTP_SCOPES` | Space-separated scopes — see `.env.example` (includes `manage_shopping_lists` for wishlist) |

### Public (safe for browser / Checkout SDK)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CTP_PROJECT_KEY` | Same as `CTP_PROJECT_KEY` |
| `NEXT_PUBLIC_CTP_REGION` | `europe-west1.gcp` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | e.g. `en-GB` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | e.g. `EUR` |
| `NEXT_PUBLIC_DEFAULT_COUNTRY` | e.g. `DE` |
| `NEXT_PUBLIC_STORE_NAME` | Store branding |
| `NEXT_PUBLIC_STORE_NAME_EMPHASIS` | Optional emphasis word |

Optional: `CTP_CHECKOUT_APPLICATION_KEY` — override checkout app (see [CHECKOUT.md](./CHECKOUT.md)).

**Never** add `STRIPE_SECRET_KEY` to Next.js env — Stripe keys belong in CT Connect only.

---

## First-time setup / emergency redeploy (optional)

Use these only when connecting a new Vercel project or forcing a one-off production deploy. Day-to-day releases go through [Automatic deploys](#automatic-deploys-production).

### Deploy with commercetools AI plugin

1. Open the project in **Cursor**.
2. Ensure the [commercetools AI plugin](https://github.com/commercetools/commercetools-ai-plugins) is installed.
3. Run the **`/deploy-vercel`** command (or `/deploy-netlify`).
4. Follow plugin safety checks and env var prompts.
5. Add all variables from the table above in the Vercel dashboard.

### Manual Vercel / CLI

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (one-time), or run `pnpm dlx vercel --prod` for an emergency CLI deploy.
2. Framework preset: **Next.js**.
3. Build command: `pnpm build` (Vercel detects pnpm from `pnpm-lock.yaml`).
4. Install command: `pnpm install --frozen-lockfile`.
5. Add environment variables (Production + Preview as needed).
6. Confirm Git integration so subsequent `main` pushes auto-deploy.

### Stripe connector CORS

After the first production URL is live, ensure the Stripe connector `ALLOWED_ORIGINS` includes your production URL (e.g. `https://zero-to-ct-storefront.vercel.app`). See [CHECKOUT.md](./CHECKOUT.md).

---

## GitHub Actions CI secrets

CI runs `pnpm build` with live CT credentials ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `CTP_PROJECT_KEY` | Project key |
| `CTP_CLIENT_ID` | Storefront BFF client ID |
| `CTP_CLIENT_SECRET` | Storefront BFF client secret |
| `CTP_SCOPES` | Full scope string from `.env.example` |

`CTP_AUTH_URL`, `CTP_API_URL`, `CTP_SESSION_URL`, and `NEXT_PUBLIC_*` are set inline in the workflow.

---

## Production URL (current)

**https://zero-to-ct-storefront.vercel.app** — first deployed 2026-07-14 via Vercel CLI; thereafter **auto-deploy from `main`**.

---

## Post-deploy checklist

| Check | How |
|-------|-----|
| Health | `GET https://zero-to-ct-storefront.vercel.app/api/health` → `{ "ok": true }` |
| Products | Homepage loads Best Sellers grid |
| Add to cart | Add item from homepage; cart badge updates |
| Checkout embed | `/checkout` loads without `no_payment_integrations` error |
| Test payment | Stripe card `4242 4242 4242 4242` → order confirmation |
| Auth | Register, sign in, view `/account` order history |
| Wishlist | Save item from homepage, view `/wishlist`, move to cart |

Run through [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) on the production URL before a sales call.

---

## Related docs

- [CHECKOUT.md](./CHECKOUT.md) — Stripe + Checkout MC/Connect setup
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — Sales demo scenarios
- [AGENT_CODING.md](./AGENT_CODING.md) — Plugin commands and workflow
