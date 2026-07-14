# UI Components — coss

This storefront uses **[coss ui](https://coss.com/ui)** for all customer-facing UI — not raw HTML, not shadcn/Radix defaults, not custom one-off components.

> **Skill:** `.agents/skills/coss/SKILL.md` — read before generating any UI code.

---

## Why coss (and why Tailwind v4 is not optional)

**coss requires Tailwind CSS v4** — stated in the skill compatibility line. You cannot use coss without it.

That sounds heavier than a “simple” PoC, but in practice:

| Concern | Reality for this PoC |
|---------|----------------------|
| “Tailwind v4 overloads the storefront” | Production CSS is **purged** — only classes you use ship to the browser (typically a few KB) |
| “I don’t want to learn Tailwind” | **Agent writes utility classes**; you review BFF and data flow |
| “Custom CSS would be simpler” | For a backend dev, maintaining hand-written CSS across 6+ pages is *more* work than coss primitives |
| Setup complexity | One-time: `pnpm dlx shadcn@latest init @coss/style` — agent handles it in Phase 1 |

**Decision (2026-07-08):** Keep **coss + Tailwind v4**. Simplicity = fewer custom decisions, not fewer dependencies.

---

## Keep the UI layer thin

PoC scope rules to avoid “overloading” the storefront:

- Install **only** coss primitives needed per page (e.g. `card`, `button`, `skeleton` for homepage — not all 54 at once)
- No custom design system, no animation libraries, no heavy image carousels
- Domain components in `components/product/` compose a few `ui/*` primitives — no deep nesting
- Prefer Server Components; client JS only for cart buttons, search input, checkout embed

---

## Bootstrap (Phase 1)

Use **pnpm** for all commands:

```bash
# 1. Next.js scaffold (if not yet created)
pnpm create next-app@latest . --typescript --tailwind --eslint --app --use-pnpm

# 2. coss theme + fonts + primitives (recommended for new projects)
pnpm dlx shadcn@latest init @coss/style

# Or on existing Next.js — add UI kit + neutral palette
pnpm dlx shadcn@latest add @coss/ui @coss/colors-neutral
```

`@coss/style` wires Inter (`--font-sans`, `--font-heading`) and Geist Mono (`--font-mono`) in `layout.tsx` automatically.

### Preview before writing files

```bash
pnpm dlx shadcn@latest add @coss/card --dry-run
pnpm dlx shadcn@latest add @coss/dialog --diff
```

---

## Primitives for this storefront

Install on demand as features are built:

| Feature | coss primitives |
|---------|-----------------|
| Product grid / PDP | `card`, `badge`, `skeleton`, `separator` |
| Search | `input`, `input-group`, `button` |
| Navigation | `breadcrumb`, `menu` |
| Cart | `button`, `table` or `card`, `number-field`, `sheet` |
| Filters (later) | `checkbox`, `select`, `accordion` |
| Feedback | `toast`, `alert` |
| Checkout embed wrapper | `frame`, `spinner` |

Full index: `.agents/skills/coss/references/component-registry.md`

---

## Agent rules when writing UI

1. **Read the primitive guide** at `.agents/skills/coss/references/primitives/<name>.md` before using a component
2. **Install missing primitives** via `pnpm dlx shadcn@latest add @coss/<component>`
3. Use **semantic tokens** (`text-muted-foreground`, `bg-card`) — no raw `bg-blue-500`
4. Use `flex flex-col gap-*` — not `space-y-*`
5. **BFF only** — UI never calls commercetools directly; fetch `/api/*`
6. Overlay primitives (Dialog, Sheet, Menu, Select): follow trigger/content hierarchy from docs — do not mix Radix patterns
7. Toasts: use coss `toastManager`, not Sonner

---

## File layout

```
components/
├── ui/                 # coss primitives (shadcn CLI output)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── product/            # domain components composing ui/*
│   ├── product-card.tsx
│   └── product-grid.tsx
└── layout/
    ├── header.tsx
    └── footer.tsx
```

Domain components live outside `components/ui/` — never edit generated coss files unless fixing install issues.

---

## Styling pitfalls (coss-specific)

- Next.js starter fonts use `--font-geist-sans` — coss expects `--font-sans`. Use `@coss/style` init or remap variables (see skill `references/rules/styling.md`)
- Do not replace `--alpha()` in theme tokens with `color-mix()` — valid Tailwind v4 syntax
- Dialog/Sheet cancel buttons: `variant="ghost"`, not `outline`

---

## References

- [coss ui](https://coss.com/ui/)
- [Particles catalog](https://coss.com/ui/particles)
- [LLM docs map](https://coss.com/ui/llms.txt)
- Skill CLI: `.agents/skills/coss/references/cli.md`
