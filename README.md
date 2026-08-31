# LadeCompile — Monorepo

Free, no-login, enterprise-grade HTML/CSS/JS online compiler. Part of the LadeStack suite, competing with [OneCompiler](https://onecompiler.com/html). **Infrastructure-only** in this phase — no editor features, no AI integration.

## Monorepo Structure

```
/
├── apps/
│   ├── web/        # Astro 5 + @astrojs/cloudflare → homepage + /blog/* → Cloudflare Worker
│   └── editor/     # Next.js 15 (App Router) + @opennextjs/cloudflare → /editor/* → Cloudflare Worker
├── package.json    # npm workspaces (apps/*)
├── package-lock.json
├── .npmrc
└── README.md
```

| Path | App | Stack | Routes |
|------|-----|-------|--------|
| `apps/web` | Astro Worker `ladecompile-web` | Astro 5 · `@astrojs/cloudflare` adapter · `output: static` | `/` · `/blog/*` · fallback `/*` |
| `apps/editor` | Next.js Worker `ladecompile-editor` | Next.js 15 App Router · `@opennextjs/cloudflare` · `basePath: /editor` | `/editor/*` |

Both Workers deploy under **one domain** via Cloudflare **path-based Wrangler routing**:

- `compile.ladestack.in/*` → `ladecompile-web` (`apps/web`) — placeholder domain, swap to real domain in both `apps/*/wrangler.jsonc`
- `compile.ladestack.in/editor/*` → `ladecompile-editor` (`apps/editor`) — more specific route wins per Cloudflare route specificity

No AI features in this phase; no Vercel-specific APIs.

## Prerequisites

- Node.js `>=20` (tested on 26.4.0)
- npm `>=10` (tested on 11.17.0) — **npm workspaces** is the package manager for this repo
  > Why npm not pnpm? `pnpm`'s isolated store uses NTFS junctions/symlinks which require Windows Developer Mode / elevation. `next build`'s output-file-tracing then fails with `EPERM: operation not permitted, symlink` on Windows. `npm`'s flat `node_modules` avoids this and `opennextjs-cloudflare build` works on Windows without elevation. On Linux/macOS/CI either manager works; the build is identical.
- Wrangler `>=4` (`npx wrangler --version`)
- For deploying: `wrangler login` / `CLOUDFLARE_API_TOKEN` + zone `ladestack.in`

## Install

```bash
npm install
```

## Run — Dev Servers

Each app runs independently and shows its default welcome page (no homepage/editor content yet — next prompt).

### Astro — homepage + blog

```bash
npm run dev:web          # or: npm run dev --workspace=web
# http://localhost:4321/        → Astro welcome card
# http://localhost:4321/blog/   → (future blog routes, same worker)
```

- Adapter: `@astrojs/cloudflare` with `platformProxy.enabled: true`, `imageService: "compile"`, `sessionKV: false`
- Output: `static` (server entry `dist/_worker.js/index.js` + static assets in `dist/`)

### Next.js — editor tool

```bash
npm run dev:editor       # or: npm run dev --workspace=editor
# http://localhost:3000/editor   → Next.js welcome card (basePath /editor)
```

- `next.config.mjs` wires `initOpenNextCloudflareForDev()` for Workers runtime parity locally
- `basePath: "/editor"` so the app's `/` maps to external `/editor/*` (matches Wrangler route)
- `images.unoptimized: true` — no Vercel image loader
- **No edge runtime** — uses Node.js compatibility layer via `compatibility_flags: ["nodejs_compat"]` per OpenNext requirements
- `outputFileTracingRoot` set to monorepo root to silence multi-lockfile warning from stray `C:\Users\...\package-lock.json`

## Build

```bash
npm run build            # both apps
npm run build:web        # Astro only → apps/web/dist
npm run build:editor     # Next.js only → apps/editor/.next
```

Cloudflare bundle for the editor (required before deploy):

```bash
npx --workspace=editor opennextjs-cloudflare build
# → apps/editor/.open-next/worker.js + .open-next/assets
```

Smoke check after build:
- `apps/web/dist/index.html` should contain "LadeCompile web"
- `apps/editor/.next` and `.open-next/worker.js` should exist

## Deploy — Cloudflare Workers

Two separate Workers, one domain, path split via `routes` in each `wrangler.jsonc`. Replace `compile.ladestack.in` / `ladestack.in` with the real zone.

```jsonc
// apps/web/wrangler.jsonc
{
  "name": "ladecompile-web",
  "routes": [{ "pattern": "compile.ladestack.in/*", "zone_name": "ladestack.in" }]
}
// apps/editor/wrangler.jsonc
{
  "name": "ladecompile-editor",
  "routes": [{ "pattern": "compile.ladestack.in/editor/*", "zone_name": "ladestack.in" }]
}
```

Deploy commands:

```bash
# Web — uses Wrangler directly (Astro adapter already emits _worker.js)
npm run deploy:web
# Equivalent: npx wrangler deploy --config apps/web/wrangler.jsonc
# Dry-run validation: npx wrangler deploy --dry-run --config apps/web/wrangler.jsonc

# Editor — via OpenNext
npm run deploy:editor
# Equivalent: npx --workspace=editor opennextjs-cloudflare build && npx --workspace=editor opennextjs-cloudflare deploy
# Dry-run validation for editor bundle (build already validates):
npx --workspace=editor opennextjs-cloudflare build
npx wrangler deploy --dry-run --config apps/editor/wrangler.jsonc
```

Notes:
- `apps/web/wrangler.jsonc` — `main: "./dist/_worker.js/index.js"`, `assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "single-page-application" }`. A file `apps/web/public/.assetsignore` (`_worker.js`) is copied to `dist/.assetsignore` so Wrangler does not upload the server directory as a static asset (otherwise error: "Uploading a Pages _worker.js directory as an asset").
- `apps/editor/wrangler.jsonc` — `main: ".open-next/worker.js"`, `assets: { directory: ".open-next/assets", binding: "ASSETS", not_found_handling: "single-page-application" }`. `opennextjs-cloudflare preview` warns `Routes will attempt to serve Assets on a configured path` for `/editor/*` — this is expected: Cloudflare serves `/editor/_next/static/*` as assets and forwards non-asset `/editor/*` to the Worker.
- Both configs set `compatibility_date: 2025-08-01` + `compatibility_flags: ["nodejs_compat"]`.
- Both have `observability.enabled: true`.

## Verification — Acceptance Criteria

| Check | Command | Expected |
|-------|---------|----------|
| Web dev server shows Astro welcome | `npm run dev:web` → http://localhost:4321 | Card "LadeCompile web" |
| Editor dev server shows Next welcome | `npm run dev:editor` → http://localhost:3000/editor | Card "LadeCompile editor" |
| Web builds clean | `npm run build:web` | `✓ Complete!` + `dist/_worker.js/index.js` |
| Editor builds clean | `npm run build:editor && npx --workspace=editor opennextjs-cloudflare build` | `✓ Compiled successfully` + `.open-next/worker.js` |
| Wrangler routing split | Inspect `apps/*/wrangler.jsonc` `routes` | `/*` vs `/editor/*`, `zone_name: ladestack.in` |
| Deploy validation (no errors) | `npx wrangler deploy --dry-run --config apps/web/wrangler.jsonc` and same for editor | `Total Upload: ...` no `ERROR` |
| No Vercel APIs | `grep -r next/image` / search `edge` runtime | `images.unoptimized: true`, no `runtime = "edge"` |
| No AI integration | `grep -r openai` etc. | no AI files |
| Project structure | `ls apps/` | `web/` `editor/` only |

## Key Files

- `apps/web/astro.config.mjs` — `defineConfig({ adapter: cloudflare({...}), output: "static" })`
- `apps/web/src/pages/index.astro` — placeholder welcome, links to `/editor/`
- `apps/web/wrangler.jsonc` · `apps/web/public/.assetsignore`
- `apps/editor/next.config.mjs` — `initOpenNextCloudflareForDev()`, `basePath: "/editor"`, `images.unoptimized: true`, `outputFileTracingRoot`
- `apps/editor/src/app/{layout.tsx,page.tsx,globals.css}` — placeholder welcome
- `apps/editor/open-next.config.ts` — `defineCloudflareConfig({})`
- `apps/editor/wrangler.jsonc` — `main: ".open-next/worker.js"`

## What Is Out Of Scope In This Prompt

Homepage content, blog content, editor Monaco/live preview/console/share/export/templates/theme/AI Quick Actions — all deferred per spec. This prompt is infrastructure-only.

## Swapping The Placeholder Domain

Replace `compile.ladestack.in` + `ladestack.in` in both `apps/*/wrangler.jsonc` `routes[].pattern` / `zone_name` with the real domain/zone. No code changes needed elsewhere (editor's `basePath` stays `/editor`).
