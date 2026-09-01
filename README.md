# LadeCompile — Free Online HTML/CSS/JS Editor

Free, no-login, enterprise-grade HTML/CSS/JS online compiler with real-time live preview, console, theme system, templates library, export tools, and instant zero-login sharing. Part of the [LadeStack](https://ladestack.in) suite, competing directly with OneCompiler and CodePen.

---

## Monorepo Architecture

```
/
├── apps/
│   ├── web/        # Astro 5 + @astrojs/cloudflare → Marketing homepage + /blog/* → Cloudflare Worker
│   └── editor/     # Next.js 15 (App Router) + @opennextjs/cloudflare → /editor/* → Cloudflare Worker
├── DEPLOYMENT_CHECKLIST.md
├── package.json    # npm workspaces (apps/*)
├── package-lock.json
└── README.md
```

| Path | App | Framework & Runtime | Routes Handled |
|------|-----|----------------------|----------------|
| `apps/web` | Astro Worker (`ladecompile-web`) | Astro 5 · `@astrojs/cloudflare` adapter · `output: static` | `/` · `/blog` · `/blog/*` · `/robots.txt` · `/sitemap-index.xml` · `/llms.txt` |
| `apps/editor` | Next.js Worker (`ladecompile-editor`) | Next.js 15 App Router · `@opennextjs/cloudflare` · `basePath: /editor` | `/editor` · `/editor/*` · `/editor/api/share` |

Both Workers deploy under **one unified domain** (`compile.ladestack.in`) via Cloudflare path-based Wrangler routing:
- `compile.ladestack.in/*` → `ladecompile-web` (`apps/web`)
- `compile.ladestack.in/editor*` → `ladecompile-editor` (`apps/editor`) — more specific route takes precedence.

---

## Feature Overview

1. **Multi-Tab Code Editor (`apps/editor`)**:
   - Fixed 3-tab layout: `index.html`, `styles.css`, `script.js` powered by Monaco Editor.
   - Debounced 400ms automatic compilation and persistence to `localStorage`.
   - Explicit **Save** button and `Cmd/Ctrl+S` keyboard shortcut with native save dialog prevention.
   - **More-options menu**: Format Code, Reset to Default (with unsaved changes confirmation), Minimap toggle, and Keyboard Shortcuts dialog.
   - **Left icon rail**: Collapsible Explorer sidebar, in-editor Find widget (`actions.find`), and centralized Preferences Dialog (Theme, Minimap, Font Size 12px/13px/16px).
   - **Responsive & Accessible**: Dedicated mobile notice on `< 768px` viewports, IDE skeleton loading, error boundaries with retry, and full WCAG keyboard navigation.

2. **Sandboxed Live Preview & Console**:
   - Sandboxed iframe (`allow-scripts allow-same-origin`) isolated from parent origin.
   - Real-time postMessage console bridge capturing `console.log`, `console.warn`, and `console.error` with unread badges, log filtering, clear action, and auto-scroll.

3. **Templates Library**:
   - 10 curated starters (Blank, CSS Grid Dashboard, Flexbox Landing Page, Interactive Form with Validation, Dark Mode Card with Toggle, Canvas Particle Animation, Countdown Timer, Todo List with LocalStorage, Fetch API Weather Widget, Modal Dialog & Toast Notification).
   - Instant live preview in modal with category filtering, search, and unsaved work protection.

4. **Zero-Login Save & Share**:
   - **URL-Hash State (<= 2000 chars)**: Encoded into URL hash (`#code=<lz-string>`) via `lz-string` compression. 100% client-side, zero server storage needed.
   - **Cloudflare KV Short Links (> 2000 chars)**: Stored in Cloudflare KV under an 8-character ID (`/editor?share=<id>`) with a 30-day TTL.
   - **Abuse Protection**: 500 KB payload cap and per-IP rate limiting (20 shares/hour/IP).

5. **Client-Side Export**:
   - **Download ZIP**: Generates `LadeCompile-export.zip` on-demand with dynamically loaded `jszip`.
   - **Copy Code**: Copy active file or combined standalone HTML document.
   - **Screenshot Preview**: High-resolution PNG or JPEG capture of the live preview via lazy-loaded `html2canvas`.

6. **SEO & Marketing Site (`apps/web`)**:
   - Astro 5 SSR/Static with zero client JS runtime overhead for marketing pages.
   - Full dark/light theme toggle, competitor comparison matrix, interactive FAQ, and complete blog with markdown articles.
   - Auto-generated `sitemap-index.xml`, `robots.txt`, and machine-readable `llms.txt`.

---

## Local Development

### 1. Prerequisites
- Node.js `>=20` (Node 22 or 26 recommended)
- npm `>=10` (`npm install`)

### 2. Run Dev Servers
Run both apps or each independently:

```bash
# Run Astro Marketing & Blog (http://localhost:4321)
npm run dev:web

# Run Next.js Editor (http://localhost:3000/editor)
npm run dev:editor
```

---

## Production Build & Deployment

### 1. Build Verification
```bash
# Build both apps
npm run build

# Build OpenNext Cloudflare Worker bundle for the editor
npx --workspace=editor opennextjs-cloudflare build
```

### 2. Setup Cloudflare KV (for Large Shares)
```bash
# 1. Create production KV namespace
npx wrangler kv namespace create SHARE_KV

# 2. Create preview KV namespace for dev
npx wrangler kv namespace create SHARE_KV --preview

# 3. Add generated IDs to apps/editor/wrangler.jsonc:
#    "kv_namespaces": [{ "binding": "SHARE_KV", "id": "...", "preview_id": "..." }]

# 4. Generate Cloudflare TypeScript definitions
npm run cf-typegen --workspace=editor
```

### 3. Deploy to Cloudflare Workers
```bash
# Deploy both apps
npm run deploy

# Or deploy individually
npm run deploy:web
npm run deploy:editor
```

---

## Cloudflare DNS & Custom Domain Configuration

1. In the **Cloudflare Dashboard**, navigate to your zone `ladestack.in`.
2. Under **DNS** → **Records**, ensure `compile` is configured as a proxied record (orange cloud enabled `☁️ Proxied`).
3. Under **SSL/TLS**, set mode to **Full** or **Full (Strict)**.
4. Under **Workers & Pages**, verify routes for `ladecompile-web` (`compile.ladestack.in/*`) and `ladecompile-editor` (`compile.ladestack.in/editor*`).

For the complete pre-launch checklist, see [DEPLOYMENT_CHECKLIST.md](file:///c:/Users/Girish%20Lade/Downloads/LadeCompile/DEPLOYMENT_CHECKLIST.md).
