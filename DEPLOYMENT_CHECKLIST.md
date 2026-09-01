# LadeCompile Production Deployment Checklist

Comprehensive pre-launch and deployment checklist for deploying LadeCompile (`apps/web` + `apps/editor`) to Cloudflare Workers under the `compile.ladestack.in` domain.

---

## 1. Domain & DNS Configuration

- [ ] **Cloudflare Zone Setup**: Verify `ladestack.in` zone is active in your Cloudflare dashboard.
- [ ] **DNS Record**:
  - Add `compile` CNAME or AAAA record pointing to Cloudflare (e.g. `CNAME compile @` with Proxy enabled `☁️ Proxied`).
- [ ] **SSL / TLS**:
  - Set SSL/TLS encryption mode to **Full** or **Full (Strict)**.
  - Enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.

---

## 2. Cloudflare Workers & Route Precedence

- [ ] **Route Specificity Verification**:
  - `apps/web`: `compile.ladestack.in/*` (Zone: `ladestack.in`) → serves Astro homepage (`/`), blog (`/blog/*`), `sitemap-index.xml`, `robots.txt`, and `llms.txt`.
  - `apps/editor`: `compile.ladestack.in/editor*` and `compile.ladestack.in/editor/*` (Zone: `ladestack.in`) → serves Next.js 15 Monaco editor and `/api/share` Route Handlers.
  - *Cloudflare automatically evaluates routes by longest match prefix: `/editor*` takes precedence over `/*`.*

---

## 3. Cloudflare KV Setup for Large Shares

- [ ] **Create Production KV Namespace**:
  ```bash
  npx wrangler kv namespace create SHARE_KV
  ```
- [ ] **Create Preview/Dev KV Namespace (Optional)**:
  ```bash
  npx wrangler kv namespace create SHARE_KV --preview
  ```
- [ ] **Configure `apps/editor/wrangler.jsonc`**:
  Replace `SHARE_KV_NAMESPACE_ID` and `SHARE_KV_PREVIEW_NAMESPACE_ID` with the actual IDs from the output above:
  ```jsonc
  "kv_namespaces": [
    {
      "binding": "SHARE_KV",
      "id": "<YOUR_PRODUCTION_KV_ID>",
      "preview_id": "<YOUR_PREVIEW_KV_ID>"
    }
  ]
  ```
- [ ] **Regenerate TypeScript Definitions**:
  ```bash
  npm run cf-typegen --workspace=editor
  ```

---

## 4. Pre-Deployment Build Verification

Run the full monorepo build locally to ensure zero TypeScript, lint, or bundling errors:

```bash
# 1. Clean build across both Astro (web) and Next.js (editor)
npm run build

# 2. Build Cloudflare Worker bundle for editor via OpenNext
npx --workspace=editor opennextjs-cloudflare build
```

- [ ] `apps/web/dist/_worker.js/index.js` and static assets generated.
- [ ] `apps/editor/.open-next/worker.js` and `.open-next/assets` generated.
- [ ] Initial bundle size for editor is <= 190 kB First Load JS.
- [ ] No secrets or API keys are committed or bundled into client assets.

---

## 5. Production Deployment Commands

Deploy both apps to Cloudflare Workers:

```bash
# Option A: Deploy all at once
npm run deploy

# Option B: Deploy independently
npm run deploy:web
npm run deploy:editor
```

---

## 6. Post-Deployment Verification (Smoke Tests)

### Marketing & Content Routes (`apps/web`)
- [ ] **Homepage (`https://compile.ladestack.in/`)**:
  - Loads immediately with full dark/light theme support.
  - Hero CTA buttons ("Start Coding Free", "Explore Starter Templates") navigate smoothly to `/editor`.
  - Feature grid, competitor comparison table, FAQ accordion, and footer load with rich styling.
- [ ] **Blog Index (`https://compile.ladestack.in/blog`)**:
  - Lists all published articles with category tags, read times, and author badges.
- [ ] **Blog Posts (`https://compile.ladestack.in/blog/:slug`)**:
  - Semantic HTML, typography, syntax highlighting, and "Open in Editor" CTA work as expected.
- [ ] **SEO & Discovery Assets**:
  - `https://compile.ladestack.in/robots.txt` returns valid directives.
  - `https://compile.ladestack.in/sitemap-index.xml` lists all routes.
  - `https://compile.ladestack.in/llms.txt` contains full machine-readable documentation.

### Code Editor Routes (`apps/editor`)
- [ ] **Editor App (`https://compile.ladestack.in/editor`)**:
  - Monaco editor loads cleanly with animated code skeleton (no white flash).
  - Three tabs (`index.html`, `styles.css`, `script.js`) switch without loss of state.
  - Live preview iframe updates on debounced edits (400ms) with `sandboxed` security.
  - Console captures `log`, `warn`, and `error` messages via postMessage bridge.
- [ ] **Persistence & Shortcuts**:
  - Manual Save button and `Cmd/Ctrl+S` display `"Saved"` toast and write to `localStorage`.
  - Refreshing the page preserves custom code.
- [ ] **More-Options Menu & File Rail**:
  - Format Code formats active file.
  - Reset to Default prompts with unsaved changes confirmation.
  - Minimap toggle enables/disables Monaco minimap and persists setting.
  - Keyboard shortcuts dialog opens cleanly.
  - File rail toggles Explorer sidebar; Search focuses Monaco find widget.
  - Settings dialog updates Theme, Minimap, and Font Size (12px, 13px, 16px).
- [ ] **Exporting**:
  - Download ZIP downloads `LadeCompile-export.zip` with all 3 files.
  - Copy Active and Copy Combined HTML copy correctly to clipboard.
  - Screenshot PNG/JPEG captures preview iframe.
- [ ] **Zero-Login Share**:
  - **Short Code (<= 2000 chars)**: Generates URL-hash (`#code=...`), copies to clipboard, and restores accurately in Incognito.
  - **Large Code (> 2000 chars)**: Calls `/api/share`, stores in Cloudflare KV, returns 8-character short-link (`?share=...`), and restores in Incognito.
  - **Rate Limiting**: Enforces 20 shares/hour per IP on the KV endpoint.
  - **Corrupted URL Resilience**: Corrupted or invalid share links fail gracefully with warning toast and show default starter template without crashing.
- [ ] **Error Boundary**:
  - Runtime errors trigger `error.tsx` fallback UI with "Try Again" and "Homepage" options.

---

## 7. Rollback & Troubleshooting

- **Rollback in Cloudflare Dashboard**:
  - Navigate to **Workers & Pages** → select worker (`ladecompile-web` or `ladecompile-editor`) → **Deployments** → **Rollback** to previous deployment version.
- **Wrangler Rollback**:
  ```bash
  npx wrangler rollback --config apps/web/wrangler.jsonc
  npx wrangler rollback --config apps/editor/wrangler.jsonc
  ```
