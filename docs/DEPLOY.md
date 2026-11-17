# Deployment guide

How to deploy **zero-to-ct-storefront** to production (Vercel recommended).

**Production path:** when a Vercel project is linked to the repository, pushes to `main` **auto-deploy**. Initial project import, env vars, and Stripe connector `ALLOWED_ORIGINS` remain a one-time human setup. CLI / plugin deploy is optional for first-time bootstrap or emergency redeploys.

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
| `SESSION_SECRET` | **Required at runtime.** Seals every `ct_*` cookie. Base64 of at least 32 random bytes; generate with `openssl rand -base64 32`. Missing or too short: sign-in and cart sessions fail with an error naming the variable. Changing it signs all users out. Optional for `next build`. |
| `CTP_CUSTOMER_SCOPES` | Optional. Space-separated scopes requested for customer tokens; `{pk}` is replaced by `CTP_PROJECT_KEY`. Default `manage_my_profile:{pk} manage_my_orders:{pk}`. Every entry must exist on the API client. |
| `CTP_MOCK_PAYMENTS` | Optional. `true` replaces commercetools Checkout and Stripe with mock payments (demo only). Never set it for a real shop. |
| `CTP_MOCK_PAYMENTS_PROJECT_KEY` | Required whenever `CTP_MOCK_PAYMENTS=true`. Must equal `CTP_PROJECT_KEY`; if it is missing or differs, mock payments stay disabled and an error is logged once per process. |
| `CTP_CART_INVENTORY_MODE` | Optional. Inventory mode set on every new cart: `None`, `TrackOnly` or `ReserveOnOrder` (default when unset or empty). `ReserveOnOrder` makes commercetools reject an order whose quantity exceeds available stock (the shopper sees an out-of-stock message); `None` disables commercetools stock checks. The value is case-sensitive; any other value, including `ReserveOnCart`, makes `lib/commercetools/env.ts` throw `Invalid CTP_CART_INVENTORY_MODE` when it loads. |
| `IMAGE_REMOTE_PATTERNS` | Optional. Comma-separated https URL patterns `next/image` may fetch, e.g. `https://cdn.example.com/bucket/**`. Each entry needs a literal hostname and at least one literal path segment; `http:`, wildcard hosts and bare `/**` paths are rejected and fail `next build`. **Set it to the real host and path prefix of your catalog images before deploying against a real project.** The default `https://storage.googleapis.com/merchant-center-europe/sample-data/**` (assumed commercetools sample-data bucket) is unverified; if it does not match your images, `next/image` refuses to load them. |
| `HEALTH_CHECK_TOKEN` | Optional. Enables the token-gated readiness check `GET /api/health?check=commercetools` (send it in the `x-health-check-token` header). Use at least 32 random characters, e.g. `openssl rand -base64 32`. Without it the check returns 404 and `/api/health` stays a liveness probe. |

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

After the first production URL is live, ensure the Stripe connector `ALLOWED_ORIGINS` includes your production URL (e.g. `https://<your-app>.vercel.app`). See [CHECKOUT.md](./CHECKOUT.md).

---

## Rate limiting

The auth routes (`/api/auth/login`, `register`, `forgot-password`, `reset-password`) limit attempts in memory (`lib/http/auth-rate-limits.ts`):

| Route | Per IP | Per IP and email | Per email (any IP) | Lockout |
|-------|--------|------------------|--------------------|---------|
| login | 20 / 15 min | 10 / 15 min | 30 failed sign-ins / 15 min | 5 failed sign-ins / 15 min per IP and email |
| register | 5 / 60 min | n/a | n/a | n/a |
| forgot-password | 5 / 15 min | 3 / 60 min | 5 / 60 min | n/a |
| reset-password | 10 / 15 min | n/a | n/a | n/a |

The per-email ceiling stops an attack spread over many addresses. For forgot-password it counts every request and is deliberately low, so an attacker rotating addresses can hold a chosen customer at the limit for one window; the per-IP-and-email rules ensure a single address cannot.

For login the ceiling counts failed sign-ins only (wrong credentials). A slot is reserved before each credential check and kept only when commercetools rejects the credentials, so parallel requests cannot exceed the cap. The owner's own successful sign-ins and commercetools or network errors never spend the budget, and a successful sign-in does not refund earlier failures (it clears only the signing-in client's per-IP-and-email lockout). What the cap does: it limits password guessing to 30 failures per email per 15 minutes per instance. What it does not do: keep an attacker from locking the owner out. An attacker's wrong passwords count as failures, so 30 failed attempts in one window (from at least 6 addresses, because each address is locked out after 5 failures for that email) hold the email at the limit, and the owner is refused with `429` until the window ends, even with the correct password. Telling the owner apart from an attacker would need a known-device mechanism (for example a signed device cookie that bypasses the email ceiling); that is not implemented.

Each limiter tracks at most 10,000 keys and never evicts a counter that is still inside its window. When it is full of live counters, new keys share one overflow counter with the rule's own limit and window, so traffic beyond capacity stays bounded and new visitors get some attempts per window. A sustained flood of new keys can spend that budget and lock new visitors out on that instance until it subsides; the Vercel WAF rule below is the defence for that case. Over the limit, a route answers `429` with a `Retry-After` header. The counters live in one serverless instance, so they are best effort: a request that lands on another instance starts with fresh counters. IPv6 clients are keyed by their /64 prefix (one host usually controls a whole /64), and an IPv4-mapped IPv6 address counts as IPv4. On Vercel `x-forwarded-for` is overwritten by the platform, so the client IP cannot be spoofed through that header; outside Vercel, make sure your proxy does the same.

Production must also add a Vercel WAF rate-limit rule, which is enforced across all instances. Custom-rule changes are staged until you publish them, so run all three commands (a rule that is added but not published has no effect):

```bash
vercel firewall rules add "Rate limit auth" --condition '{"type":"path","op":"pre","value":"/api/auth"}' --action rate_limit --rate-limit-window 60 --rate-limit-requests 20 --rate-limit-keys ip --rate-limit-action rate_limit --yes
vercel firewall diff
vercel firewall publish --confirm-name <project-name>
```

`vercel firewall diff` shows the staged changes for review. `--confirm-name` publishes without the prompt and publishes nothing if the name does not match the project. Requests over the limit get `429`. Fixed-window rate limiting is available on all plans ([Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [firewall CLI](https://vercel.com/docs/cli/firewall)).

Registration still answers `409` for an email that already has an account, because the form needs it. The 5 / hour per-IP register limit and the WAF rule slow bulk probing of that response; they do not remove it.

---

## CI environment

CI (`.github/workflows/ci.yml` and `bitbucket-pipelines.yml`) runs `pnpm build` with placeholder `CTP_*` values and needs no commercetools secrets. `lib/commercetools/env.ts` checks that the required variables are set and that `CTP_CART_INVENTORY_MODE`, when set, is an allowed value; it makes no network calls, and every route renders per request, so the build never calls the commercetools API.

---

## Previous deployment (retired)

`https://zero-to-ct-storefront.vercel.app` ran from 2026-07-14 (first deployed via Vercel CLI, then auto-deploy from `main`) until the commercetools trial project expired. The URL no longer serves the storefront. A new deployment needs a new commercetools project and fresh environment variables.

---

## Post-deploy checklist

| Check | How |
|-------|-----|
| Health | `GET https://<your-app>.vercel.app/api/health` → `{ "ok": true }` (liveness only). Readiness: set `HEALTH_CHECK_TOKEN`, then `GET /api/health?check=commercetools` with header `x-health-check-token` → `{ "ok": true, "commercetools": "reachable" }` |
| Products | Homepage loads Best Sellers grid |
| Add to cart | Add item from homepage; cart badge updates |
| Checkout embed | `/checkout` loads without `no_payment_integrations` error |
| Test payment | Stripe card `4242 4242 4242 4242` → order confirmation |
| Auth | Register, sign in, view `/account` order history |
| Wishlist | Save item from homepage, view `/wishlist`, move to cart |

Run through [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) on your deployment, or locally, before a sales call.

---

## Related docs

- [CHECKOUT.md](./CHECKOUT.md) — Stripe + Checkout MC/Connect setup
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — Sales demo scenarios
- [AGENT_CODING.md](./AGENT_CODING.md) — Plugin commands and workflow
