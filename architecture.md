# LadeCompile — Multi-Language (i18n) Architecture Blueprint

**Status:** Blueprint (Prompt 1 of 5) — no code, authoritative source for Prompts 2-5.
**Monorepo:** `apps/web` = Astro 5 (`@astrojs/cloudflare`, `output: static`) · `apps/editor` = Next.js 15 App Router (`@opennextjs/cloudflare`, `basePath: /editor`)
**Domain:** `https://compile.ladestack.in` (single domain, two Cloudflare Workers via Wrangler path routes)
**Date:** 2026-09-02
**Languages (7):** `en` (default) · `zh` (Mandarin, `zh`) · `pt-BR` (`pt-br` in URLs) · `ru` · `ja` · `tr` · `ko`
**Conventions in this doc:** URL locale slugs are always **lowercase** (`pt-br`, not `pt-BR`). BCP-47 canonical form (`pt-BR`, `zh-CN`) is used only in `hreflang`, `lang` attributes, and message catalog keys where spec requires it.

---

## 1. URL Scheme — Decision & Justification

### 1.1 Chosen convention: **English unprefixed, six non-English locales prefixed with subdirectory**

| Locale | Code | URL form | Example |
|--------|------|----------|---------|
| English (default, `en`) | `en` | **No prefix**. Canonical is `https://compile.ladestack.in/...` | `/`, `/blog/best-free-html-css-js-compilers-2026`, `/faq`, `/editor` |
| Mandarin | `zh` | `/{locale}/...` | `/zh/`, `/zh/blog/...`, `/zh/faq`, `/zh/editor` |
| Portuguese (Brazil) | `pt-br` | `/{locale}/...` | `/pt-br/`, `/pt-br/blog/...`, `/pt-br/editor` |
| Russian | `ru` | `/{locale}/...` | `/ru/`, `/ru/blog/...`, `/ru/editor` |
| Japanese | `ja` | `/{locale}/...` | `/ja/`, `/ja/editor` |
| Turkish | `tr` | `/{locale}/...` | `/tr/`, `/tr/editor` |
| Korean | `ko` | `/{locale}/...` | `/ko/`, `/ko/editor` |

Optional alias: `/en/*` **301 redirects** to the unprefixed canonical (e.g. `/en/faq` → `/faq`). The alias is not linked anywhere, exists only to absorb external/manual `/en/` hits and to give crawlers a deterministic alternate. Never generate `/en/` URLs in sitemaps or internal links.

### 1.2 Why subdirectory over subdomain, query param, or fully-prefixed

Google's documented i18n guidance (Search Central: "Manage multi-regional and multilingual sites") lists three URL structures in preference order for most single-brand sites:

1. **Subdirectories with gTLD** (`example.com/zh/`) — recommended.
2. **Subdomains** (`zh.example.com`) — acceptable but splits authority, doubles DNS/TLS/Workers routing surface, and requires per-subdomain Wrangler configuration (our deployment is single-zone path routing; subdomains would force a separate zone or wildcard Worker dispatch, breaking the current `/editor` path contract).
3. **URL parameters** (`example.com?lang=zh`) — **explicitly discouraged** by Google: parameters are not consistently crawled, cannot be `hreflang`-targeted reliably, produce duplicate-content risk, and pollute share URLs / KV share links (`#code=` + `?lang=` collisions).

**Why not fully-prefixed including `/en/`?** Three reasons:

* **Link equity preservation.** All existing backlinks, indexed URLs, social shares, and `lz-string` hash links point at unprefixed paths (`/`, `/blog/*`, `/editor`). Making English `/en/*`-prefixed would require 301-migrating the entire site, resetting social-share counters, and rewriting every external guide that links to `compile.ladestack.in/editor`. Unprefixed default is zero-cost migration.
* **Canonical hygiene.** `x-default` (required by hreflang spec) should point at the language-agnostic / default-language page. If English lives at `/en/`, `x-default` becomes ambiguous (is `/` a locale-less chooser page or a redirect?). Unprefixed English lets `x-default` == English canonical cleanly, which matches Google's example.
* **UX: global English audience is the majority.** Prefixing 60-70% of traffic adds a meaningless path segment and makes copy-pasted URLs longer. The six secondary audiences each get an explicit signal; the default audience pays zero overhead.

The `/en/` → `/` redirect covers the consistency argument (purists who want "every locale has a prefix can still use `/en/`; it just normalizes).

### 1.3 URL invariants (must hold after i18n)

* **Trailing-slash policy stays as-is:** Astro's `trailingSlash` default; do not introduce forced redirects per locale — it doubles redirect chains (`/zh/blog` ↔ `/zh/blog/`). Pick one and mirror across locales.
* **Locale segment is always the first path segment** after `/`. No nested locale (`/blog/zh/...` is invalid). Regex: `^/(zh|pt-br|ru|ja|tr|ko)(/|$)` — everything else is English.
* **Case normalization:** any request for `/ZH/`, `/PT-BR/`, `/Pt-Br/` 301s to lowercase. Cloudflare or app middleware handles it; canonical is lowercased.
* **Query and hash are locale-invariant.** Share links `?share=<id>` and `#code=<lz-string>` work with or without locale prefix: `/zh/editor?share=abc12345` and `/editor?share=abc12345` load the same KV payload. The editor must not encode locale into the share payload.
* **Static assets are never locale-prefixed.** `/_astro/*`, `/_next/*`, `/favicon.svg`, `/blog/*.svg`, `/.well-known/*` remain root-relative and served by the appropriate Worker without locale stripping.

### 1.4 Canonical examples

```
English (canonical)          https://compile.ladestack.in/
                             https://compile.ladestack.in/blog/best-free-html-css-js-compilers-2026
                             https://compile.ladestack.in/faq
                             https://compile.ladestack.in/editor
                             https://compile.ladestack.in/editor?share=ABC12345#code=H4sI...

Mandarin                     https://compile.ladestack.in/zh/
                             https://compile.ladestack.in/zh/blog/best-free-html-css-js-compilers-2026
                             https://compile.ladestack.in/zh/faq
                             https://compile.ladestack.in/zh/editor
                             https://compile.ladestack.in/zh/editor?share=ABC12345

Portuguese (Brazil)          https://compile.ladestack.in/pt-br/
                             https://compile.ladestack.in/pt-br/faq
                             https://compile.ladestack.in/pt-br/editor

Russian / Japanese / Turkish / Korean — same pattern with /ru, /ja, /tr, /ko
```

---

## 2. Routing — Layering Locale Prefixes on Top of Existing Path Routing

### 2.1 Current routing (before)

Two Workers on a single zone, distinguished by Cloudflare path specificity (longer pattern wins):

```
apps/web  (ladecompile-web)     routes: [ "compile.ladestack.in/*" ]          → handles /, /blog/*, /faq, /privacy, /terms, /robots.txt, /sitemap-index.xml, /llms.txt, static
apps/editor (ladecompile-editor) routes: [ "compile.ladestack.in/editor*", "compile.ladestack.in/editor/*" ] → handles /editor, /editor/*, /editor/api/share
```

```
                         ┌─────────────────────────────────────────────┐
                         │     Cloudflare Edge (zone: ladestack.in)    │
                         │         Route matching (most-specific wins)  │
                         └──────────────┬──────────────────────────────┘
                                        │
                     ┌──────────────────┼──────────────────┐
                     │                  │                   │
              path = /editor* ? ──YES──┤                   │──NO──▶ ladecompile-web
                     │                 ▼                   │        (Astro)
                     │        ladecompile-editor           │
                     │          (Next.js)                  │
                     └──────────────────┘
```

**Limitation of Wrangler `routes.pattern`:** Cloudflare zone routes are **glob patterns**, not regex. The `pattern` field supports only `*` as wildcard; it does not support alternations `(zh|pt-br|...)`, optional segments, or captures. Therefore locale-aware routing **cannot** be expressed as a single pattern like `compile.ladestack.in/{locale}/editor*`.

### 2.2 Target routing (after) — locale-prefix-aware

```
Desired dispatch (conceptual):

  IF path matches  ^/(zh|pt-br|ru|ja|tr|ko|en)/editor(/|$|?|#).*  →  ladecompile-editor
  IF path ==       /editor(/|$|?|#).*                            →  ladecompile-editor  (English unprefixed)
  ELSE                                                        →  ladecompile-web
```

Because Wrangler patterns cannot express the first rule as one line, we **enumerate** per locale in the route tables and **complement with middleware-level locale stripping** inside each Worker (so the app-level routers — Astro's file router and Next.js's App Router — never need to handle the raw prefixed path).

Approach is **dual-layer**:

1. **Layer 1 — Edge (Wrangler route enumeration):** ensure Cloudflare dispatches the locale-prefixed `editor` paths to the editor Worker. Without this, `/zh/editor` would incorrectly hit the `/*` web Worker.
2. **Layer 2 — App middleware (locale stripping):** each Worker's request handler (Astro middleware / `middleware.ts` in Next.js / Cloudflare Worker fetch handler) detects a leading locale segment, validates it against the allowlist, strips it before routing, and makes the resolved `{ locale, pathnameWithoutLocale }` available downstream. The Astro build still outputs locale-prefixed HTML files at distinct paths.

```
                         ┌─────────────────────────────────────────────────┐
                         │          Cloudflare Edge (zone: ladestack.in)    │
                         │   Route table (enumerated, most-specific wins)   │
                         │                                                  │
                         │  1. compile.ladestack.in/zh/editor*    → editor │
                         │  2. compile.ladestack.in/zh/editor/*   → editor │
                         │  3. compile.ladestack.in/pt-br/editor* → editor │
                         │  4. compile.ladestack.in/pt-br/editor/*→ editor │
                         │  5. compile.ladestack.in/ru/editor*    → editor │
                         │  6. compile.ladestack.in/ru/editor/*   → editor │
                         │  7. compile.ladestack.in/ja/editor*    → editor │
                         │  8. compile.ladestack.in/ja/editor/*   → editor │
                         │  9. compile.ladestack.in/tr/editor*    → editor │
                         │ 10. compile.ladestack.in/tr/editor/*   → editor │
                         │ 11. compile.ladestack.in/ko/editor*    → editor │
                         │ 12. compile.ladestack.in/ko/editor/*   → editor │
                         │ 13. compile.ladestack.in/en/editor*    → editor │ (alias → 301 handled inside)
                         │ 14. compile.ladestack.in/en/editor/*   → editor │
                         │ 15. compile.ladestack.in/editor*       → editor │ (English unprefixed)
                         │ 16. compile.ladestack.in/editor/*      → editor │
                         │ 17. compile.ladestack.in/*             → web    │ (catch-all, includes /zh/*, /pt-br/*, etc. non-editor)
                         └──────────────┬──────────────────────────────────┘
                                        │
                           ┌────────────┼────────────┐
                           │            │             │
                    hit editor routes ──┤             ├── hit web catch-all
                           │            │             │
                           ▼            │             ▼
                  ladecompile-editor    │    ladecompile-web (Astro)
                  (Next.js, basePath    │     - Middleware: extract locale
                   stripping)           │       strip prefix, inject Astro.locals.locale
                           │            │     - Serves prebuilt locale-prefixed HTML
                           │            │       (/zh/index.html, /pt-br/faq/index.html, etc.)
                           └────────────┘

     Inside each Worker (Layer 2):
     ┌──────────────────────────────────────────────────────────┐
     │  rawPath = new URL(request.url).pathname                 │
     │  { locale, pathnameWithoutLocale } = parseLocale(rawPath)│
     │    - if first segment ∈ { zh, pt-br, ru, ja, tr, ko, en }→ locale = it (normalized lowercase), pathnameWithoutLocale = remainder or "/" │
     │    - else → locale = "en", pathnameWithoutLocale = rawPath│
     │  Normalize: "/en/..." → 301 to unprefixed "/"            │
     │  Route app on pathnameWithoutLocale                       │
     │  Set/response headers carry locale for hreflang/canonical │
     └──────────────────────────────────────────────────────────┘
```

### 2.3 Exact Wrangler config changes

#### `apps/editor/wrangler.jsonc` — after

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ladecompile-editor",
  "compatibility_date": "2025-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.js",
  // Cloudflare route specificity: longest match wins. Locale-prefixed editor
  // routes must be enumerated because Wrangler patterns are globs, not regex.
  // The unprefixed /editor* entries preserve the current English contract.
  "routes": [
    // Mandarin
    { "pattern": "compile.ladestack.in/zh/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/zh/editor/*", "zone_name": "ladestack.in" },
    // Portuguese (Brazil) — pattern is lowercase; middleware handles case-normalization + redirect
    { "pattern": "compile.ladestack.in/pt-br/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/pt-br/editor/*", "zone_name": "ladestack.in" },
    // Russian
    { "pattern": "compile.ladestack.in/ru/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/ru/editor/*", "zone_name": "ladestack.in" },
    // Japanese
    { "pattern": "compile.ladestack.in/ja/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/ja/editor/*", "zone_name": "ladestack.in" },
    // Turkish
    { "pattern": "compile.ladestack.in/tr/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/tr/editor/*", "zone_name": "ladestack.in" },
    // Korean
    { "pattern": "compile.ladestack.in/ko/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/ko/editor/*", "zone_name": "ladestack.in" },
    // English alias /en (will 301 to unprefixed inside middleware; route still needed so it hits editor)
    { "pattern": "compile.ladestack.in/en/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/en/editor/*", "zone_name": "ladestack.in" },
    // English canonical (current contract — keep)
    { "pattern": "compile.ladestack.in/editor*",  "zone_name": "ladestack.in" },
    { "pattern": "compile.ladestack.in/editor/*", "zone_name": "ladestack.in" }
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "kv_namespaces": [
    { "binding": "SHARE_KV", "id": "SHARE_KV_NAMESPACE_ID", "preview_id": "SHARE_KV_PREVIEW_NAMESPACE_ID" }
  ],
  "observability": { "enabled": true }
}
```

**Why 16 entries and not fewer?** Both `editor*` (matches `/editor` itself, no trailing slash) and `editor/*` (matches `/editor/...`) are needed — this mirrors the current file's intentional duplication and avoids a gap at `/zh/editor` without slash. Each locale variant follows the same pair.

#### `apps/web/wrangler.jsonc` — after

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ladecompile-web",
  "compatibility_date": "2025-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/_worker.js/index.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  // Single catch-all. All locale-prefixed non-editor paths (/zh/, /zh/blog/*, /pt-br/faq, etc.)
  // naturally match this pattern and are routed to the web Worker.
  // No enumeration needed — the locale prefix is stripped by Astro middleware inside this Worker.
  // Keep ONE entry so editor's more-specific enumerated routes take precedence.
  "routes": [
    { "pattern": "compile.ladestack.in/*", "zone_name": "ladestack.in" }
  ],
  "observability": { "enabled": true }
}
```

Web keeps a single `/*` catch-all because the zone route for web is intentionally lower-specificity; editor's enumerated routes are longer and win per Cloudflare's "most-specific route" rule. No `compile.ladestack.in/zh/*` entries are required or desirable at Wrangler level for web (would double-count). The locale handling for web is entirely Layer 2.

### 2.4 Middleware-level locale stripping (Layer 2 — required even after route enumeration)

Route enumeration only guarantees dispatch to the correct Worker. It does **not** rewrite `Request.url` — the Workers still receive the raw prefixed path. Without stripping, Astro would look for `src/pages/zh/index.astro` (which does not exist) and Next.js would see `pathname = /zh/editor` which does not match `basePath: /editor`.

**Shared parsing utility** (plain JS, duplicated or shared via `packages/i18n` — Prompts 2-3 decide packaging):

```ts
// packages/i18n/src/parse-locale.ts (illustrative — no code to implement yet)
export const SUPPORTED_LOCALES = ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"] as const;
export const NON_DEFAULT_LOCALES = ["zh", "pt-br", "ru", "ja", "tr", "ko"] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function parseLocale(rawPathname: string): { locale: Locale; pathnameWithoutLocale: string; hadPrefix: boolean } {
  // Normalize leading slash
  const pathname = rawPathname.startsWith("/") ? rawPathname : `/${rawPathname}`;
  const seg = pathname.slice(1).split("/")[0]?.toLowerCase(); // first segment
  if (seg && LOCALE_SET.has(seg)) {
    const locale = seg as Locale;
    const rest = pathname.slice(1 + seg.length) || "/";
    // rest is "/" if locale-only path like "/zh" or "/zh/"
    // Ensure pathnameWithoutLocale always starts with "/"
    const pathnameWithoutLocale = rest.startsWith("/") ? rest : `/${rest}`;
    return { locale, pathnameWithoutLocale: pathnameWithoutLocale === "" ? "/" : pathnameWithoutLocale, hadPrefix: true };
  }
  return { locale: "en", pathnameWithoutLocale: pathname, hadPrefix: false };
}
```

Rules:

* **Case-insensitive match, lowercase canonical:** `/ZH/faq` → locale `zh`, redirect 301 to `/zh/faq`.
* **`/en/` handling:** `parseLocale("/en/faq")` returns `{ locale: "en", pathnameWithoutLocale: "/faq" }`. The middleware then issues a 301 `Location: /faq` (and for `/en/editor` → `/editor`). Search engines see a clean canonical without loop.
* **Invalid / unsupported locale like `/fr/faq`:** not in `SUPPORTED_LOCALES`, therefore locale = `en` and path is not stripped — `/fr/faq` renders 404 in English (alternatively, could treat as 404 + language chooser; but do not silently guess). Do not 301 `/fr/*` to `/` — that would mask typos and break legitimate paths that happen to start with two-letter segments (though none exist currently; keep invariant that only allowlisted segments are stripped).
* **Query + hash passthrough:** `parseLocale` operates on `pathname` only; `search` and `hash` are carried forward unchanged after redirect/rewrite.

#### Astro (web) specifics

* Astro middleware at `src/middleware.ts` (runs on the Cloudflare Worker adaptor at request time):
  1. Call `parseLocale(Astro.url.pathname)` → `{ locale, pathnameWithoutLocale }`.
  2. If `locale === "en" && hadPrefix` → `return redirect(pathnameWithoutLocale + search + hash, 301)`.
  3. If `locale !== "en"` and the trailing path case mismatch (had uppercase input vs lower) → redirect to lowercased URL.
  4. Set `Astro.locals.locale = locale` and `Astro.locals.pathnameWithoutLocale` for page/component access.
  5. **Do not rewrite the URL for static output** — instead, Astro's build must already output prefixed HTML files (`dist/zh/index.html`, `dist/zh/faq/index.html`, ...). The middleware at runtime just validates. If the Worker serves file `dist/zh/index.html` for `/zh/`, no rewrite is needed other than ensuring the request hits that asset. For the `single-page-application` not_found_handling, a middleware rewrite to `/{locale}/index.html` or to asset fetch with `pathnameWithoutLocale` may be needed depending on `@astrojs/cloudflare` asset resolution — Prompt 2 will verify against that adaptor.
* **Dev parity:** `astro dev` should also run the middleware so `/zh/faq` and `/zh/editor` are testable locally without Cloudflare.
* **Build:** must generate HTML for every locale × every page (7 × N pages). See §5.

#### Next.js (editor) specifics

* Next.js `middleware.ts` at `apps/editor/src/middleware.ts` (Next.js Middleware runs in the OpenNext Cloudflare Worker context):
  1. Parse locale using same utility on `request.nextUrl.pathname`.
  2. If locale `en` + hadPrefix → `NextResponse.redirect(new URL(pathnameWithoutLocale + search, request.url), 301)`.
  3. Otherwise, strip the locale segment and **rewrite** (not redirect) to the unprefixed path so App Router routing still works:
     ```ts
     if (hadPrefix && locale !== "en") {
       const url = request.nextUrl.clone();
       url.pathname = pathnameWithoutLocale;
       // Preserve locale for downstream components via header + cookie
       const res = NextResponse.rewrite(url);
       res.headers.set("x-ladecompile-locale", locale);
       return res;
     }
     ```
  4. Set response header `x-ladecompile-locale` and ensure the `ladecompile_locale` cookie (see §4) is consistent with URL. URL wins — cookie is updated to match URL on every request.
  5. **basePath interaction:** Current `next.config` uses no explicit `basePath` (the Wrangler route provides the `/editor` mount). With locale stripping, `/zh/editor` rewrites to `/editor` and matches correctly. No change to Next.js `basePath` is required; do not set `i18n` routing in `next.config` (Next.js built-in i18n conflicts with manual subdirectory + Worker-deploy setups and with OpenNext). Keep locale logic entirely in `middleware.ts`.
* Static assets (`/_next/*`, `/favicon.svg`) bypass locale stripping (check prefix `/_next/` before parsing).

### 2.5 Before/after summary table

| Scenario | Before | After (with Wrangler + middleware) |
|----------|--------|-------------------------------------|
| `GET /faq` | → web Worker, serve `/faq` (en) | Same (en) |
| `GET /zh/faq` | → web Worker but 404 (no `/zh/faq` file, no middleware) | → web Worker, middleware parses `zh`, serves `dist/zh/faq/index.html`; correct `hreflang` + `lang=zh` |
| `GET /editor` | → editor Worker (`/editor`) | Same (en) |
| `GET /zh/editor` | → web Worker (**wrong** — `/*` catches it, editor patterns don't match locale prefix) | → editor Worker via enumerated `zh/editor*` route, middleware rewrites to `/editor`, locale `zh` in header/cookie, editor renders zh strings |
| `GET /pt-BR/editor?share=x` (uppercase) | → web Worker (wrong) | → editor Worker, 301 to `/pt-br/editor?share=x`, then rewrite |
| `GET /en/faq` | → web Worker 404 | → web Worker, 301 to `/faq` |
| `GET /fr/faq` (unsupported) | → web Worker 404 | → web Worker 404 (no strip — locale remains `en`, 404 page in English) |
| `GET /zh/blog/slug` | → web Worker but would serve en blog if not built per-locale | → web Worker, serves locale-specific markdown entry or falls back to en with banner (see §5) |

---

## 3. Locale Detection & Fallback Order

### 3.1 Source-of-truth ordering

```
1. URL prefix  (authoritative; always wins)
2. Manual selection (persisted cookie)  — used ONLY when URL has no locale prefix
3. Accept-Language header (first visit only, non-authoritative)
4. Default English  (en)
```

**Step 1 — URL prefix is absolute source of truth.** No header, no cookie, no geo-IP may override it. Request to `/ja/faq` always renders Japanese FAQ, sets `html lang="ja"`, canonical `/ja/faq`, regardless of what `Accept-Language` or cookie says. This is essential for:

* **Shareability / link determinism.** Two users who share `/ru/editor?share=x` see the same language.
* **SEO determinism.** Crawlers request specific locale URLs; the response language must match the URL, or hreflang breaks and Google flags mismatch.
* **No layout shift / no JS redirect flash** when arriving via a shared locale URL.

**Step 2 — Manual selection (cookie).** When the user arrives at an **unprefixed** URL (e.g. `/`, `/faq`, `/editor`) the only signals available are the persisted preference and `Accept-Language`. If the cookie `ladecompile_locale` exists and is in the allowlist, it determines the locale for the current render **without redirect**, or (depending on redirect strategy chosen below) triggers a soft redirect. Prompt 2/3 will decide the exact rendering vs redirecting behavior; the architecture mandates that the cookie value is authoritative here and is **not overwritten by `Accept-Language`**.

**Step 3 — `Accept-Language` header.** Used only when both URL prefix is absent **and** no cookie exists — i.e., genuine first visit to an unprefixed English path. We parse `Accept-Language` (`en,pt-BR;q=0.9,zh;q=0.8`), iterate in quality order, and pick the first value whose primary subtag or full tag matches `SUPPORTED_LOCALES`. This signal is **advisory, not authoritative**: we do **not** 301-redirect based on it by default (see §3.2). We may surface a one-time banner ("View this page in Portuguese?") linking to the localized URL.

**Step 4 — Fallback.** If no match, render English.

### 3.2 To-redirect-or-not on first visit?

HSTS-style geo/auto-redirecting to `/zh/` on the first hit to `/` has three downsides that outweigh the convenience:

* SEO duplicate-content risk if Googlebot's `Accept-Language` varies (Googlebot sends `Accept-Language: en` but may crawl from varied IPs).
* Breaking share expectations (a user copies `/` and pastes to a colleague, the colleague gets `/zh/`).
* Cookie vs header authority confusion.

**Recommended policy:**

* **Do not auto-redirect naked `/` to `/zh/` based on `Accept-Language`.** Render English at `/` but show a **dismissible language-suggestion banner** when `Accept-Language` top match is a non-English supported locale and no cookie exists. Banner action: `Go to 日本語 →` links to `/{locale}/` equivalent, set cookie to chosen locale.
* **Optional lenient behavior for deep paths:** If `Accept-Language` is unambiguous and the user is anonymous (no cookie), you may issue a **302** (not 301) to the locale-prefixed path for `/faq` → `/zh/faq` — but only if user has not dismissed the banner. For MVP, keep the banner-only approach for all paths to remain conservative.
* **Manual chooser always wins thereafter** and makes `Accept-Language` irrelevant.

### 3.3 Pseudocode (runs only on unprefixed requests)

```ts
function resolveLocaleForUnprefixedRequest(req: Request, cookies: Cookies): Locale {
  const cookieLocale = cookies.get("ladecompile_locale")?.toLowerCase();
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  // No cookie — check Accept-Language (only on first visit; banner policy may just render en + banner)
  const header = req.headers.get("accept-language") ?? "";
  const negotiated = negotiateAcceptLanguage(header, SUPPORTED_LOCALES); // q-sort, exact or primary-subtag match
  if (negotiated && negotiated !== "en") {
    // For "no-redirect" policy, DO NOT return negotiated here — instead return "en"
    // and surface banner. For "redirect" policy, return negotiated.
    // Architecture recommends banner-only, so this branch is informational.
  }
  return "en";
}
```

On prefixed requests: skip all cookie/header logic entirely; return the URL locale.

---

## 4. Persistence — Where Language Preference Lives

### 4.1 Decision: **Shared, host-wide cookie** (`ladecompile_locale`) with `localStorage` mirror where useful

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Primary store** | Cookie `ladecompile_locale` | Must work across **both** Workers on the same domain (`compile.ladestack.in`). `localStorage` is origin-scoped per Worker/app tab? Actually same domain share — `localStorage` is scoped to origin (scheme+host+port), so both Workers on same domain share `localStorage` if the page is same origin domain. However: (a) `localStorage` is **client-only** — server middleware (Astro/Next.js edge rendering) cannot read it to decide locale before render, causing FOUC/flash. (b) Cookie is sent on every request, so server can pre-select correct locale + set `hreflang` + choose correct HTML file without JS. (c) Cookie works for first-paint SEO — localStorage requires hydration. Use cookie as primary. |
| **Cookie name** | `ladecompile_locale` | Namespace to avoid collision with other LadeStack apps (`ladestack.*`). No `i18n_` generic prefix. |
| **Value domain** | One of `SUPPORTED_LOCALES` lowercased (`zh`, `pt-br`, `ru`, `ja`, `tr`, `ko`, `en`) | If `en` is chosen, the value is literally `"en"` — but its presence means the chooser's preference was explicitly English, suppressing Accept-Language banner. |
| **Scope** | `Domain=compile.ladestack.in` (implicit via host-only), `Path=/`, `SameSite=Lax`, `Secure` (on HTTPS), `HttpOnly=false` (so JS chooser can read/write it without a round-trip), `Max-Age=31536000` (1 year) | `Path=/` is critical so `/editor` and `/blog/*` and `/faq` share one cookie. Single cookie on `compile.ladestack.in` is sent to both Workers — Cloudflare routes are paths on the same host, so one `Set-Cookie: Path=/` covers both. Do not set `Path=/editor`. |
| **Expiry** | `Max-Age=31536000` (1 year), renew on each manual switch | Long-lived. No session-only. On app reinstall / cookie clear, we fall back to Accept-Language banner again. |
| **Update rule** | Cookie is set/overwritten **(a)** whenever user picks a language in any chooser (header/footer dialog, editor Settings → Language, footer globe), **(b)** whenever a locale-prefixed URL is visited (URL authoritative, so cookie is silently updated to `locale` to keep future unprefixed visits consistent). Cookie is NOT overwritten by `Accept-Language`. | Ensures "last explicit intent" wins. A user sharing `/ja/editor` with a colleague who opens it will not permanently change the colleague's cookie if we only update on explicit chooser action — but updating on prefixed visit is desirable for most users (visiting `/ja/*` is itself an explicit intent). Pick: update on prefixed visit as soft intent; Prompt 2-3 can make this configurable. |
| **localStorage mirror** | `ladecompile:locale` in `localStorage` duplicates cookie value on write, for editor client-only fast path (shell state) | `EditorShell` can read `localStorage` without parsing `document.cookie`; useful for instant Monaco label switch before any network round-trip. Maintained as mirror: write to both on switch, read cookie when available, fallback to `localStorage` if cookie parse fails. Never let localStorage diverge — cookie is master, overwritten value propagates to localStorage on next load. |
| **Header / query param fallback** | None as primary. `Accept-Language` only advisory. No `?lang=zh` query param locale (query param approach is rejected for SEO). | Eliminates canonical duplication. |

**Set-Cookie header example** (issued by either Worker):

```
Set-Cookie: ladecompile_locale=pt-br; Path=/; Max-Age=31536000; SameSite=Lax; Secure
```

**Reading:**

* Server (Astro middleware, Next.js middleware): `request.headers.get("cookie")` → parse `ladecompile_locale`.
* Client (chooser component, editor Settings): `document.cookie.split(";").find(c => c.trim().startsWith("ladecompile_locale="))` + `localStorage.getItem("ladecompile:locale")`.

**Why not `localStorage` alone?** As noted, the Workers cannot access localStorage at render time; the page would always SSR as English and then flash-swap after hydration. Under Cloudflare Workers SSR that defeats static pre-render for locale.

**Why not two cookies (`Path=/` and `Path=/editor`)?** Would split history: switching language in web (`/zh/`) would not affect editor's notion of language. A user whose marketing site is in Japanese expects `/editor` → Japanese labels transiently; separate cookies break that expectation. One cookie unifies intent.

**Security/privacy:** This cookie is preference/essential-functional, not tracking. No consent gate required under GDPR/ePrivacy, but mention it in the Privacy page.

---

## 5. Content Storage Strategy Per App

### 5.1 Global principle: **separate the concern of "what is translated" from "how"**

* `apps/web` hosts **long-form content + page scaffolding**: blog posts (collections) + page templates (Homepage hero/features, FAQ page, legal pages, nav/footer). Long-form content dwarfs short UI strings in volume and needs content-collection semantics. UI chrome around it needs lightweight catalog keys.
* `apps/editor` hosts **UI strings only**: no blog content, no CMS, no markdown. Labels, dialogs, tooltips, error pages, console panel strings — all short atomic strings.

### 5.2 `apps/web` (Astro) — recommended: **locale-scoped content collections (directory per locale) + shared schema + locale-aware message catalogs for chrome**

**Recommended layout:**

```
apps/web/src/
├── content/
│   ├── config.ts              // deprecated — now src/content.config.ts (Astro 5)
│   ├── blog/
│   │   ├── en/                // English is canonical / fallback source
│   │   │   ├── best-free-html-css-js-compilers-2026.md
│   │   │   ├── onecompiler-alternatives-free-code-editor.md
│   │   │   ├── html5-canvas-vs-svg-guide.md
│   │   │   ├── zero-login-developer-tools-future.md
│   │   │   └── draft-upcoming-monaco-features.md
│   │   ├── zh/
│   │   │   ├── best-free-html-css-js-compilers-2026.md
│   │   │   └── ... (same slugs, translated bodies + frontmatter)
│   │   ├── pt-br/
│   │   ├── ru/
│   │   ├── ja/
│   │   ├── tr/
│   │   └── ko/
│   └── faq/                   // Option: promote FAQ to collection, or keep as page
│       ├── en.json            // OR keep pages/faq.astro localized via message catalog
│       └── zh.json            // (FAQ structured data below resolves to one of two models)
├── i18n/
│   ├── locales.ts             // SUPPORTED_LOCALES, BCP-47 maps, helper isLocale()
│   ├── ui/                    // Astro chrome catalogs (header/footer/page templates + common nav/footer/legal)
│   │   ├── en.json
│   │   ├── zh.json
│   │   ├── pt-br.json
│   │   ├── ru.json
│   │   ├── ja.json
│   │   ├── tr.json
│   │   └── ko.json
│   ├── faq/                   // Alternative to faq collection — per-locale FAQ entries as JSON
│   │   ├── en.json
│   │   ├── zh.json
│   │   └── ...
│   └── blog/                  // Per-locale fallbacks for untranslated slugs? (handled in collection layer)
│
├── pages/
│   ├── index.astro            // Should become [locale] routing or i18n folder; see build strategy
│   ├── faq.astro
│   ├── blog/
│   │   └── [...slug].astro
│   ├── privacy.astro
│   └── terms.astro
│   └── zh/                    // OR locale-prefixed folders mirroring generated HTML
│   └── pt-br/
│   └── ...
├── components/
│   ├── Header.astro           // Consumes Astro.locals.locale + i18n/ui/{locale}.json
│   └── Footer.astro
├── layouts/
│   └── BaseLayout.astro
├── middleware.ts              // locale parse + cookie + locals injection
└── utils/
    ├── i18n.ts                // getLocale(), getTranslate(), localePath()
    └── sitemap-i18n.ts        // generating per-locale sitemaps (see §7)
```

**Why directory-per-locale (`src/content/blog/en/`, `.../zh/`) over single collection with `locale` frontmatter field:**

| Criterion | Directory-per-locale (chosen) | Single collection with `locale` field |
|-----------|-------------------------------|---------------------------------------|
| Slug collision | Each locale has its own namespace; same slug reused across locales maps to locale-specific URLs cleanly (`/blog/slug` ↔ `/zh/blog/slug`). Enforces 1:1 slug correspondence at FS level. | Same benefit but requires filter logic `entry.data.locale === "zh"` at every query; easier to accidentally query cross-locale. |
| Fallback / missing translation detection | A missing file in `zh/` is an obvious FS check (`existsSync`); fallback to `en/` file is explicit and enumerable. CI can lint "80% of blogs missing pt-br — ship English with banner or 404?". | Missing translation is a missing collection entry; indistinguishable from draft — requires separate tracking sheet. |
| Build performance | Astro `glob({ base: "./src/content/blog/zh" })` isolates loaders; can generate 7 static routes in parallel. `getCollection("blog")` per locale is cheap. | Single `getCollection("blog")` loads all locales into one array (N × 7) then filters. Not huge, but unnecessary fanout for large blogs. |
| Content authoring UX | Translators work in their locale folder without risk of editing the wrong frontmatter field; Git path-ownership via CODEOWNERS per folder (`/src/content/blog/zh/ @l10n-zh-reviewers`). | One folder with mixed locales mixes review concerns. |
| Future CMS / machine translation pipeline | Each locale folder can be pointed at a separate translation branch / external sync job (e.g. `i18n/*_zh.json → blog/zh/`). | Requires custom filtering. |

Schema strategy:

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function blogFor(locale: string) {
  return defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: `./src/content/blog/${locale}` }),
    schema: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      pubDate: z.coerce.date().optional(),
      publishDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default("LadeStack Team"),
      image: z.string().optional(),
      heroImage: z.string().optional(),
      imageAlt: z.string().default("LadeCompile article banner"),
      category: z.string().default("Web Development"),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      canonicalURL: z.string().url().optional().or(z.literal("")).optional(),
      // New i18n fields
      locale: z.enum(["en","zh","pt-br","ru","ja","tr","ko"]).optional(),
      translationOf: z.string().optional(), // slug of original en file for fallback link
      noTranslate: z.boolean().default(false),
    }).transform((data) => ({
      ...data,
      pubDate: data.pubDate ?? data.publishDate ?? new Date(),
      image: data.image ?? data.heroImage ?? "/favicon.svg",
    })),
  });
}

export const collections = {
  blog_en: blogFor("en"),
  blog_zh: blogFor("zh"),
  blog_pt_br: blogFor("pt-br"),
  blog_ru: blogFor("ru"),
  blog_ja: blogFor("ja"),
  blog_tr: blogFor("tr"),
  blog_ko: blogFor("ko"),
  // Or single dynamic registration: Object.fromEntries(SUPPORTED_LOCALES.map(l=>[`blog_${l.replace("-","_")}`, blogFor(l)]))
};
```

Alternative if Astro 5's `collections` export does not cleanly support dynamic keys in some setups: keep **one** `blog` collection with `locale` field and enforce via directory nesting `locale/slug.md` + parse path. The doc recommends directory-per-locale; Prompt 2 will verify Astro 5 collection loader constraints and choose between the two without changing the external contract (directory names stay the same, page routes are locale-prefixed either way).

For **page chrome** (Homepage hero, FAQ page shell, privacy/terms shells, header/footer/CTA copy): use lightweight JSON catalogs `src/i18n/ui/{locale}.json` keyed by namespace (`index.hero.title`, `nav.features`, `footer.privacy`, etc.) or nested JSON. Keep these separate from content collections because they are < 100 keys per locale and don't need frontmatter/draft semantics. Pages import the right file based on `locale`.

**FAQ strategy (two layers):** Visible FAQ content currently lives as `faqs: FaqItem[]` inline in `pages/faq.astro` plus `FAQPage` JSON-LD generated from the same array. There are two translation models:

* **Model A (catalog + page template):** Keep `pages/faq.astro` but back it with `src/i18n/faq/{locale}.json` (14 Q&A per locale). The `faqs` array is loaded from the locale's catalog at render. Simplest to implement, keeps FAQPage JSON-LD generation locale-aware trivially (just translate each Question.name + Answer.text).
* **Model B (content collection):** Promote FAQ to `src/content/faq/{locale}/*.md` and treat FAQ entries as content, enabling rich inline HTML + revision history. Overkill for 14 items; Model A is recommended.

**Legal pages (privacy, terms):** Each is a near-static HTML page ~500-800 words referencing `hello@ladestack.in`, sitemap/robots links, and brand name. Store as `src/i18n/legal/{locale}.md` or `src/pages/privacy.astro` with catalog; each locale gets a fully translated file (no fallback). Because legal wording may be jurisdiction-aware, do not partially translate; full file per locale.

**Blog page indexing per locale:** `src/pages/blog/index.astro` and `src/pages/blog/[...slug].astro` become locale-aware. Astro build options:

* Option 1 — **Duplicated route trees:** `src/pages/index.astro`, `src/pages/zh/index.astro` (one file per locale). Scales poorly (7× files).
* Option 2 — **Rest parameter for locale:** `src/pages/[...locale]/index.astro` with `getStaticPaths` enumerating `[ {params:{locale: undefined}}, {params:{locale:"zh"}}, ...]`. More elegant, but interacts with Astro SSR middleware.
* Option 3 — **Middleware + single set of files that read `Astro.locals.locale`** for copy + fetching the right collection (`getCollection(`blog_${locale}`)` or filtered). URLs like `/zh/blog/slug` are produced via `getStaticPaths` that expand slugs per locale. This is the recommended Option 3 for least duplication: one canonical `index.astro` + one `blog/[...slug].astro` that generates paths for all locales. Pages read locale from params or locals.

Fallback for untranslated slugs: when `/ru/blog/html5-canvas-vs-svg-guide` has no `ru` file but `en` does, policy options:
  1. **404 in that locale** (strict) — clean but poor UX.
  2. **Serve English with banner** ("This article hasn't been translated to Russian yet — showing English. Contribute a translation?") — better for SEO coverage and share continuity.
  Recommended: option 2 with `noindex` suppressed? Actually should still index English; Russian URL would then canonical to English? Better to **not create the Russian path** unless translated — generation step only emits paths for which a file exists. `/ru/blog/` listing only shows translated posts; untranslated posts do not appear and `/ru/blog/untranslated-slug` 404s with a localized 404. This keeps crawling clean. The banner alternative is only needed if mixing.

### 5.3 `apps/editor` (Next.js) — recommended: **JSON message catalogs per locale + ICU-lite interpolation**

**Recommended layout:**

```
apps/editor/src/
├── i18n/
│   ├── locales.ts           // shared SUPPORTED_LOCALES + BCP-47 map
│   ├── messages/
│   │   ├── en.json          // canonical keys (e.g. tabs.indexHtml = "index.html", topBar.run = "Run")
│   │   ├── zh.json
│   │   ├── pt-br.json       // lowercase file to match URL slug, BCP-47 zh/ru/ja/tr/ko mapping in header
│   │   ├── ru.json
│   │   ├── ja.json
│   │   ├── tr.json
│   │   └── ko.json
│   └── dictionaries.ts      // type-safe loader: loadDictionary(locale), t(key, params)
├── app/
│   ├── [locale]/            // Option: route group capturing locale prefix (if middleware uses rewrite)
│   │   └── editor/
│   └── editor/              // Current structure preserved after middleware rewrite
├── components/
│   └── editor/
│       └── EditorShell.tsx  // reads t("topBar.run") etc.
└── middleware.ts            // locale strip + rewrite + x-ladecompile-locale header
```

Why `messages/{locale}.json` catalogs:

* **No content collection semantics** — editor strings are ~80-150 flat keys (see checklist §6), not markdown; they want a simple key→string map with dot namespacing and late parameter interpolation (`"Share link copied — {desc}"`).
* **Framework-agnostic** — can be consumed directly in React Client Components without Next.js built-in `i18n` router (which conflicts with OpenNext). Supports Next.js `next-intl`-style dictionary helpers without needing `next-intl` itself if dependency budget tight; `next-intl` is allowed but not mandatory — a 100-line `createTranslator(locale, messages)` helper suffices.
* **Bundle-splitting friendly** — `messages/zh.json` is imported dynamically or split per locale so English users do not download 6 unused dictionaries. Pattern: `const dict = await import(/* webpackChunkName */ \`@/i18n/messages/${locale}.json\`)` guarded to supported locales.
* **Translatable keys cover more than src text** — includes `aria-label`, `TooltipContent`, `DialogDescription`, `Toast.title/description`, `DropdownMenuLabel`. Checklist enumerates all surfaces.
* **ICU plural support** — minimal: editor has numeric interpolation ("{count} warnings, {count} errors", "30-day TTL", "20 shares/hour") but not many plurals; simple `{placeholder}` replacement suffices. Full `intl-messageformat` optional.

**Why not TypeScript files like `i18n/zh.ts`?** JSON is toolable for translation vendors (Crowdin, Phrase, machine translation scripts that read JSON). TypeScript exporter can wrap JSON with type checks (`satisfies` schema) for exhaustiveness lint.

**Why not keep current hard-coded strings and thread `<I18nProvider>` only for top-level chrome?** Leads to mixed coverage — checklist in §6 shows numerous strings buried deep in `EditorShell.tsx` (1500 lines, dozens of literals). All strings must be inventoried and externalized; partial pass leaves visible English leaks.

**Catalog key naming (proposed):** dot-separated namespace `editor.*`:

```
editor.tabs.indexHtml, editor.tabs.stylesCss, editor.tabs.scriptJs
editor.topBar.badgeHtml    ("HTML / CSS / JS — no login required")
editor.topBar.run, editor.topBar.templates, editor.topBar.moreOptions
editor.console.title ("Console"), editor.console.empty ("Console — Click Run to start · logs clear per run"), editor.console.clear, editor.console.badge
editor.appTopNav.home, features, templates, blog, ladestackLink, overview
editor.explorer.title, editor.explorer.projectFiles
editor.drawer.files
editor.desktopOnly.title, editor.desktopOnly.body, editor.desktopOnly.backToHomepage, editor.desktopOnly.continueToMobile
editor.share.hashCopiedTitle, editor.share.hashCopiedDesc, editor.share.kvGenerating, editor.share.kvCopiedDesc, editor.share.errorTitle
editor.export.downloadZip, export.copyActive, export.copyCombined, export.screenshotPng, export.screenshotJpeg
editor.dialogs.confirmOverwrite.title, body, action
editor.templates.searchPlaceholder, editor.templates.noResults, editor.templates.loadCta
editor.settings.title, editor.settings.themeToggle, editor.settings.language, editor.settings.fontSize, editor.settings.minimap
editor.preferences.minimapEnabled, minimapDisabled, fontSizeSet
editor.tooltips.templates, tooltips.run, tooltips.moreOptions, tooltips.toggleTheme, tooltips.save, tooltips.share, tooltips.export
editor.errors.shareKvFailed, editor.errors.screenshotFailed, editor.errors.consoleTruncated
editor.errorPages.generic.title, description, retryCta, homeCta
editor.errorPages.notFound.title, body
...(etc.)
```

**Language names for the chooser itself must be endonym + English subtitle** — example: `中文 (Chinese)` / `Português (Brasil) (Portuguese)` / `Русский (Russian)` / `日本語 (Japanese)` / `Türkçe (Turkish)` / `한국어 (Korean)` / `English`. Stored as `meta.languageNames.{locale}` keys so chooser rendering is not locale-dependent.

### 5.4 Cross-app consistency invariants

* **Shared locale allowlist and helpers live once.** Even if `apps/web/src/i18n/locales.ts` and `apps/editor/src/i18n/locales.ts` are duplicated today, they must export identical `SUPPORTED_LOCALES` ordering and a canonical `toBcp47(locale)` map (`zh → zh-CN? Actually zh stays zh; pt-br → pt-BR; ko → ko-KR` — in `hreflang` we emit `zh`, `pt-BR`, `ru`, `ja`, `tr`, `ko`). Prompts 2-4 should eliminate drift (either extract `packages/i18n` or keep files in sync via lint rule `no-divergent-locales`). Draft convention: `zh`=IETF `zh`, `pt-br`=BCP-47 `pt-BR`, others plain `ru`, `ja`, `tr`, `ko`.
* **URL helper `localePath(locale, pathnameWithoutLocale)`** is used everywhere an href is emitted (Header, Footer, BaseLayout, BlogCard,PrevNext). Pattern: `locale === "en" ? pathname : \`/${locale}${pathname}\``. Never hard-code `/${locale}/` in JSX without the helper — otherwise `/en/` leaks into links.
* **Cookie name and path are identical across apps** (see §4). Setting it in one app immediately influences the other's "unprefixed" interpretation on next request.
* **Build must fail if any catalog JSON is missing a key present in `en.json`.** CI check `i18n:check-sync` compares key sets and reports absent keys per locale.

---

## 6. Pages / Surfaces Requiring Translation — Exhaustive Checklist

Every string visible to a user, indexed by a search engine, or announced by a screen reader must be translatable. The following is the full inventory as of 2026-09 against the checked-out snapshot (`Header.astro`, `Footer.astro`, `layouts/*`, `pages/index.astro`, `pages/faq.astro`, `pages/blog/*`, `components/blog/*`, `editor/src/app/*`, `editor/src/components/editor/EditorShell.tsx`).

### 6.1 `apps/web` — tables in order of crawl priority

#### Marketing: Homepage (`src/pages/index.astro`)

| # | Component / section | Original (EN) string / pattern | File |
|---|---------------------|--------------------------------|------|
| W-01 | Kicker pill | `Free · No login · No paywall — ever` | `index.astro:25` |
| W-02 | Hero H1 | `Free HTML, CSS & JS compiler,` / `no login required.` | `index.astro:29-32` |
| W-03 | Hero sub-paragraphs (×2) | `LadeCompile is the quiet, enterprise-grade online code compiler…` / `Part of the LadeStack suite…` | `index.astro:34-39` |
| W-04 | Primary/secondary CTA | `Open Web Editor — it's free` / `Explore Starter Templates` | `index.astro:44-53` |
| W-05 | CTA footnote | `No account needed to write, save, or share.` | `index.astro:55` |
| W-06 | Trust points (×3) | `Zero-Login URL Sharing` / `400ms Debounced Preview` / `Client-Side ZIP Export` | `index.astro:58-77` |
| W-07 | Code snapshot mock | Window chrome `index.html`, `styles.css`, `script.js`, `Live`, console footer `Console: Ready — 0 warnings, 0 errors` | `index.astro:84-131` |
| W-08 | Standards strip | `Built with open web standards…` + 6 items `HTML5 Living Standard` / `CSS3 Grid & Flexbox` / `ECMAScript 2024` / `Monaco Engine` / `Sandboxed Iframe` / `Cloudflare Edge` | `index.astro:141-171` |
| W-09 | Coral signature card | Title `Zero-login code execution…` + body + `Launch Live Compiler` + pipeline mock `Compilation Pipeline`, `400ms Debounce`, step labels | `index.astro:175-224` |
| W-10 | Demo-card grid (×4 cards + heading) | Heading `Every feature you need…` + card eyebrow/title/bodies (Zero-Storage Sharing, Export Suite, Monaco Engine, Curated Starters) + badge chips (`.ZIP`, `HTML`, `PNG`, `CSS Grid`, …) | `index.astro:226-320` |
| W-11 | Tabbed showcase | Section heading `Engineered for uncluttered focus.` + 4 tab labels (`Three-File Harmony`, `Sandboxed Console Bridge`, `Local-First Storage`, `Unsaved Work Protection`) + tab descriptions + `Active Capability`, `Dedicated Tabbed Editor Environment`, `Ready to write code?` / `Open Editor →` | `index.astro:322-421` |
| W-12 | Starters / templates grid | Heading `Curated starters for immediate prototyping.` / `Open in Web Editor` + 6 card titles/bodies + `Load template →` | `index.astro:423-481` |
| W-13 | Cream callout | Title `The path to 10× faster prototyping…` + body | `index.astro:483-497` |
| W-14 | Comparison matrix | Heading `A free OneCompiler alternative…` + body + table (column headers `Capability`, `LadeCompile`, `OneCompiler*`, row labels — 5 rows) + footnote `*Comparison based on publicly available…` | `index.astro:499-557` |
| W-15 | CTA band | Title `Start building with LadeCompile right now.` + body + `Open Web Editor — Free` / `Read Articles & Guides` | `index.astro:559-582` |
| W-16 | Script / tab data (client JS) | Tab content titles/bodies for `tab-1..4` (identical to W-11 labels — must translate or reuse catalog) | `index.astro:589-611` |
| W-17 | SEO metadata | Page `title`, `description` (rendered via `BaseLayout` + `SEO.astro`) | `index.astro:6-8` |

#### Navigation & layout (shared across web pages)

| # | Element | EN strings | Files |
|---|---------|------------|-------|
| W-18 | Global vendor header | Logo `LC` / wordmark `LadeCompile` / badge `LADESTACK` | `Header.astro:7-11`, `Footer.astro:10-13` |
| W-19 | Primary nav (desktop + mobile) | `Features` (`/#features`), `Templates` (`/#starters`), `Comparison` (`/#comparison`), `Blog` | `Header.astro:14-18,49-55` |
| W-20 | Header CTAs | `Templates`, `Open Editor` (desktop) / `Open Web Editor — it's free` (mobile sheet) | `Header.astro:22-57` |
| W-21 | Mobile a11y + menu | `aria-label Open/Close navigation menu`, `aria-expanded`, menu sheet `Mobile navigation` | `Header.astro:30-60` |
| W-22 | Footer blurb | `Free, no-login HTML/CSS/JS…` / `Part of the LadeStack ecosystem…` | `Footer.astro:14-19` |
| W-23 | Footer Product column | Heading `Product` + links `Web Editor`, `Core Capabilities`, `Starter Templates`, `Comparison Matrix`, `Articles & Guides`, `FAQ` | `Footer.astro:22-32` |
| W-24 | Footer LadeStack Suite column | `LadeStack Suite` heading + `LadeStack Hub`, `LadeCompile`, `GB Coder SOON`, `API Playground SOON` | `Footer.astro:34-42` |
| W-25 | Footer Resources column | `Resources & Open Spec` heading + `Sitemap XML`, `Robots.txt`, `LLMs.txt Spec`, `hello@ladestack.in` | `Footer.astro:44-52` |
| W-26 | Footer legal bar | `© {year} LadeStack · …` / links `Privacy`, `Terms`, `GitHub` (note: currently both Privacy + Terms point to `https://ladestack.in` — need per-locale privacy/terms pages) | `Footer.astro:55-61` |
| W-27 | Base layout chrome | `<meta name="theme-color">` + font preconnects + body classes are not strings, but `SEO.astro` title/desc/canonical/OG/Twitter per page are — see W-17 + every page's frontmatter | `BaseLayout.astro:35-61`, `SEO.astro:6-77` |

#### Content / utility pages

| # | Page | Strings | Files |
|---|------|---------|-------|
| W-28 | FAQ (`/faq`) | Page heading `Help & Answers` + H1 `Frequently asked questions about our online HTML compiler.` + sub-lede + 14 × Question + Answer (rich HTML with links/code) + accordion a11y labels + bottom CTA `Ready to try it yourself?` + link rows — **and** `FAQPage` JSON-LD (same 14 entries) must be fully translated (not just wrapped) | `pages/faq.astro:6-95` (questions array), `faq.astro:102-110` (JSON-LD), `faq.astro:119-173` (template) |
| W-29 | Blog listing (`/blog`) | Heading / subtitle / filter labels (e.g. `Trading`, `INVESTING`, `F&O`, category/topic rail), `All Articles`? Related check `src/pages/blog/index.astro` + `BlogGrid`, `BlogCard`, `TableOfContents` components | `pages/blog/index.astro`, `components/blog/*` |
| W-30 | Blog post (`/blog/[...slug]`) | Every post's frontmatter (`title`, `description`, `category`, `tags`, `author`, `imageAlt`) + Markdown body — per-locale file. Plus layout chrome `BlogHeader`, `BlogMeta` (date/author/category), `Breadcrumbs`, `PrevNextNav`, `RelatedPosts`, `SaaSCta`, `TableOfContents` UI labels (`On this page`, `← Previous article`, `Next article →`, `Related articles`) | `pages/blog/[...slug].astro`, `layouts/BlogPostLayout.astro`, `components/blog/*` |
| W-31 | Static infra labels | `404` page copy (`Not Found`, `Sorry, the page you're looking for doesn't exist.`, `Back to home`) | `pages/404.astro` |
| W-32 | Legal (new pages needed) | `/privacy` and `/terms` do not yet exist as local pages — they are outbound links to `ladestack.in`. Per SEO and locale completeness, each locale needs its own `/privacy` + `/terms` (see SEO §7). Strings: headings, body sections, last-updated date, contact email | Not yet in repo — new pages |
| W-33 | SEO/global infra strings | `SEO.astro` defaults: fallback `title`, `description`, `og:locale`, `og:type`, `twitter:card` labels are not translated, but **their values are**. Also `src/layouts/BaseLayout.astro` `<html lang="en">` must become `lang={locale}` and `dir` if needed (LTR for all 7 locales, so no RTL). | `BaseLayout.astro:35`, `SEO.astro:54` |

> **Count for web:** ~45 distinct string groups; 80% are on Homepage + FAQ + blog shell. Blog post bodies (× N posts × 7 locales) dominate word-count.

### 6.2 `apps/editor` — UI surfaces (no blog content)

Editor's strings are exclusively **interface chrome** around the Monaco + preview + console workbench. Inventory derived from `app/layout.tsx` and `EditorShell.tsx` (1500+ lines).

| # | Surface | Strings (EN) | File / component |
|---|---------|--------------|------------------|
| E-01 | App-level header (`RootLayout`) | `LadeCompile` + `LADESTACK` badge, nav `Home`, `Features`, `Templates`, `Blog`, `LadeStack ↗`, right CTAs `Blog` (mobile), `Overview`. Plus `<html lang="en">` attribute and `<title>`/`<meta name="description">`. | `app/layout.tsx:50-104` |
| E-02 | Top bar (editor workspace) | Badge `HTML` (orange dot) + subtitle `HTML / CSS / JS — no login required`. Buttons: `Templates`, `Run`, overflow `More options`. Tooltips: `Templates`, `Run`, `More options`, `Toggle theme`, `Save`, `Share`, `Export`. Mobile hamburger `Open menu` + drawer title `Files`. | `EditorShell.tsx:1168-1200` |
| E-03 | Editor tabs | Fixed labels `index.html`, `styles.css`, `script.js` (these filenames must **not** be translated — filenames stay literal, but any surrounding labels like "Active tab" can). Tab switcher must still reflect pending flush logic. | `EditorShell.tsx:77-87` + tabs array |
| E-04 | Left icon rail + drawer | Tooltips/labels `Explorer`, `Search (Ctrl+F)`, `Settings` + drawer sections `Files`, `Project Files`, drawer extras `Search`, `Templates`, `Settings`, `Light theme`/`Dark theme`. IconButton a11y `aria-label`. | `EditorShell.tsx:96-126`, `1102-1140` |
| E-05 | Explorer sidebar | Panel title `Explorer`, close `X` `aria-label="Close Explorer"`, section heading `Project Files`, file row highlight logic (active uses `bg-accent`). Empty state none (always shows 3 files). | `EditorShell.tsx:1128-1165` |
| E-06 | Settings dialog (`settingsOpen`) | Trigger `Settings`. Contains preferences: theme toggle, font size radios (`12px`/`13px`/`16px` per spec — labels not translated? numbers stay, label prefix translated: "Font size: {n}px"), `Language` picker (new — 7 options with endonym + flag), `Minimap` toggle switch (checkbox), `Keyboard Shortcuts` link. Close `X`. All strings need translation including helper `ladecompile:editor:fontSize:v1`, `minimap:v1` not user-visible. | `EditorShell.tsx:155-167`, `174-193`, `752-779`, plus Settings dialog render |
| E-07 | More-options dropdown | Items `Format Code`, `Reset to Default`, `Minimap` (checkbox with check), separator, `Keyboard Shortcuts`. Each has an icon. | `EditorShell.tsx:1213-1244` |
| E-08 | Templates modal | Dialog title `Templates`, `Search` input `placeholder` (e.g. "Search templates…"), categories `Starters`, `Layouts`, `Components`, `Forms`, item title/description per template (10 items: `Blank`, `CSS Grid Dashboard`, `Flexbox Landing Page`, `Interactive Form with Validation`, `Dark Mode Card with Toggle`, `Canvas Particle Animation`, `Countdown Timer`, `Todo List with LocalStorage`, `Fetch API Weather Widget`, `Modal Dialog & Toast Notification`), preview snippet per template (HTML preview text not translated), CTA `Load template` / `Use template`, empty state `No templates match "…"` + unsaved-work confirmation `Confirm overwrite?` dialog with actions `Cancel`/`Load`/`Continue`. | `EditorShell.tsx:141-149`, `496-527`, `1420-1490` approx |
| E-09 | Keyboard shortcuts dialog | Title `Keyboard Shortcuts`, table of 6-8 combos `Save / Compile Ctrl/Cmd+S`, `Find & Replace Ctrl/Cmd+F`, `Toggle Minimap — Preferences Menu`, `Format`, `Run`. Descriptions per row. Close `X`. | `EditorShell.tsx:168-171` + shortcuts dialog |
| E-10 | Console panel | Header `Console:`, badges `Ready` (state: Ready, 0 warnings, 0 errors; updated per run), buttons `Clear`, `Collapse/Expand` (chevron). Body empty state `Console — Click Run to start · logs clear per run` + per-entry level (`log`/`warn`/`error`) + entry message + timestamp (`toLocaleTimeString` — must respect `locale` for time format). Count badge on collapsed panel shows `{n}`. Truncation notice `… (truncated)` at 2000 chars, cap `99+` for unread badge. Auto-scroll toggle behavior description. | `EditorShell.tsx:89-94`, `228-232`, `429-503`, `937-986` |
| E-11 | Preview iframe | Attribute `title="Live preview"` (a11y), loading placeholder none. Error state when `contentDocument` missing → toast `Screenshot capture failed — preview may contain external content`. | `EditorShell.tsx:923-935` |
| E-12 | Share + Export toasts | `Save` → toast `Saved`. `Share` → states: `Share link copied to clipboard — URL-hash link copied — no login needed`, `Generating share link…`, `Short link created via Cloudflare KV — no login needed`, `Share link generated`, `Share failed — {error}`. `Download ZIP` → `Generating ZIP archive…` / `ZIP downloaded — LadeCompile-export.zip — 3 files` / `ZIP download failed`. `Copy {tab}` → `Copied to clipboard — {tab} — {n} chars` / `Copy failed — clipboard permission denied`. `Copy combined HTML → Copied combined HTML — Full preview document copied`. `Screenshot → Capturing preview as PNG…` / `Screenshot downloaded as PNG` / `Screenshot capture failed — preview may contain external content`. Warning `Could not load shared code — showing default template`. Info `Already showing default starter template`. Overwrite warning `Your changes will be overwritten — Continue/Cancel`. KV payload fallback notice `No login needed — large share via Cloudflare KV (30-day TTL)`. | `EditorShell.tsx:661-674`, `796-862`, `535-640` |
| E-13 | Reset / Confirm dialogs | `Reset to Default` → confirm `Reset your workspace?` body `This cannot be undone without resetting…` + `Cancel`/`Reset`. `Pending template` confirmation `Overwrite your current edits with template "{name}"?` + `Cancel`/`Load`. `Pending share` confirmation `Load shared code and overwrite local edits?` (`Discard local`/`Keep local`). Each title/description modeled in templates.ts but obnoxious text in shell. | `EditorShell.tsx:722-760` |
| E-14 | Mobile barrier | Title `Desktop Experience Recommended`, body `LadeCompile works best on a larger screen…`, CTAs `Back to Homepage`, `Continue to Mobile Editor`. | `EditorShell.tsx:989-1019` |
| E-15 | Error pages (Next.js) | `app/error.tsx` → `Something went wrong` (global error boundary + retry `Try again`), `app/not-found.tsx` → localized 404 (`Page not found` + `The editor at this address doesn't exist` + links `Go to editor` / `Back to homepage`), `app/editor/error.tsx` (sub-route boundary). These are server components needing locale at render. | `app/error.tsx`, `app/not-found.tsx`, `app/editor/error.tsx` |
| E-16 | Editor defaults + code comments | `DEFAULT_FILES` source literals — not translated; but their inline comments `<!-- LadeCompile Live -->` could be locale but not required. Templates definitions in `lib/templates.ts` — each template's **title + description** above are user-facing and must be in message catalogs (structure stays in code, i18n values move to `messages/{locale}.json`). | `lib/templates.ts`, `lib/editorDefaults.ts` |
| E-17 | Language chooser entry points | New entry points required (not yet in code): **(a)** header language globe / `Select language` button in app top bar, **(b)** Settings → Language select (dropdown or radio), **(c)** optional footer language row on `/editor`? Each shows same 7 options list. Confirm dialog `Switch language? Your unsaved edits stay locally, UI language changes instantly.` | No existing component — spec for Prompts 3/5 |

> **Count for editor:** ~16 surface groups; ~120 locale-keys when flattened. The densest file is `EditorShell.tsx` (~150 strings if counting toast messages + tooltips + ARIA labels).

### 6.3 Surfaces explicitly **out** of scope (do not translate)

* File extensions / literals: `index.html`, `styles.css`, `script.js`, `.zip`, `.png`, `.jpeg`, `.html`, `text/html`, KV binding `SHARE_KV`, HTTP header names.
* Technical tokens: CSS values `#6366f1`, `l10n` aliases, `lz-string`, `JSZip`, `postMessage`, `allow-scripts`.
* URLs, email `hello@ladestack.in`, brand `LadeCompile`/`LadeStack` (only subtitle/boilerplate around them).

---

## 7. SEO Requirements to Satisfy in Prompts 2-5 (Deferred Implementation — Specify Now)

All bullet points in this section are **acceptance criteria** that code changes in Prompts 2-5 must meet; they are not aspirational. Cross-reference Google Search Central, W3C i18n, and Astro/Next.js SSR constraints.

### 7.1 `hreflang` — all locale alternates + `x-default` on **every** indexable page

* **Shape:** For any HTML response at `https://compile.ladestack.in/...` (English) and its six equivalents, the `<head>` must contain 7 `<link rel="alternate" hreflang="{BCP47}">` entries + one `x-default`:

```html
<!-- Example: response for /faq (English) — same block on /zh/faq with same hrefs, roles reversed -->
<link rel="alternate" hreflang="en"     href="https://compile.ladestack.in/faq" />
<link rel="alternate" hreflang="zh"     href="https://compile.ladestack.in/zh/faq" />
<link rel="alternate" hreflang="pt-BR"  href="https://compile.ladestack.in/pt-br/faq" />
<link rel="alternate" hreflang="ru"     href="https://compile.ladestack.in/ru/faq" />
<link rel="alternate" hreflang="ja"     href="https://compile.ladestack.in/ja/faq" />
<link rel="alternate" hreflang="tr"     href="https://compile.ladestack.in/tr/faq" />
<link rel="alternate" hreflang="ko"     href="https://compile.ladestack.in/ko/faq" />
<link rel="alternate" hreflang="x-default" href="https://compile.ladestack.in/faq" />
```

* `x-default` points at the **English unprefixed canonical** for all locales. Do not self-reference a locale URL with `x-default`.
* **BCP-47 canonicalization in `hreflang` only:** `pt-BR`, `zh` (not `zh-CN` unless we add script variance later), `ru`, `ja`, `tr`, `ko`, `en`. File slugs stay lowercase `pt-br`; header value is `pt-BR`.
* **Bi-directional completeness:** If `/zh/faq` exists but `/ru/faq` does not yet (untranslated), emit **only** the locales for which HTML actually exists. Do not emit 404 targets. Prompts must query "which locales have this path on disk / in `getStaticPaths`?" to build the alternate map per page.
* **Also emit `HTTP Link` header** via Cloudflare for non-HTML edge-discoverability? Optional — if page already has the `<link>` head for crawlers, the header is redundant. Adding both is safe but verify per Google ("header + head duplicates are OK if consistent").
* **Audit rule:** Every page with `<html lang="en">` must have `og:locale` matching that `lang`. Currently `SEO.astro:54` hard-codes `en_US`. After i18n, `og:locale` maps from locale: `en→en_US`, `zh→zh_CN`, `pt-br→pt_BR`, `ru→ru_RU`, `ja→ja_JP`, `tr→tr_TR`, `ko→ko_KR`.
* **HTTP `Content-Language` header:** Emit per locale (`Content-Language: zh`, etc.) alongside `<html lang=…>`.

### 7.2 Canonical URLs per locale (no sharing)

* Each locale's HTML is **self-canonical**. `/zh/faq` canonicalizes to `https://compile.ladestack.in/zh/faq` (not to English). This follows Google's "Language-specific canonicals" guidance — hreflang and canonical must agree: canonical = locale-specific, alternate set = peer locales.
* Fallback content (English showing on `/ru/blog/untranslated-slug` if that behavior is chosen) must **not** canonicalize to English; it has two valid options: (a) do not create the URL (so no canonical needed), or (b) `rel="canonical"` self + `noindex` or soft banner. Our recommended policy is (a) — don't emit fallback URLs.
* **Query and hash variants strip:** `canonicalURL` must be `new URL(Astro.url.pathname, site)` exclusive of `search` and `hash`. A request to `/zh/editor?share=x` keeps canonical `/zh/editor` (the share ID is transient). If share URLs should be canonical-share? No — they are editor states with ephemeral IDs, but still locale-canonical to the base editor path.
* **Uppercase or `/en/` redirects are 301 before canonical computation** — canonical never emits uppercase or `/en/`.

### 7.3 Locale-specific sitemaps or sitemap index

* Current setup: `@astrojs/sitemap` integration emits `/sitemap-index.xml` + `sitemap-0.xml` covering `/`, `/blog/*`, `/faq`. After i18n there are two valid approaches; choose one:

  * **Option A — sitemap index with per-locale sitemaps (recommended).** Generate `sitemap-en.xml` (or `sitemap-0.xml` as English for compatibility), `sitemap-zh.xml`, `sitemap-pt-br.xml`, etc., referenced from a single `/sitemap-index.xml` at the origin:

    ```xml
    <!-- /sitemap-index.xml -->
    <sitemapindex>
      <sitemap><loc>https://compile.ladestack.in/sitemap-en.xml</loc><lastmod>2026-09-02</lastmod></sitemap>
      <sitemap><loc>https://compile.ladestack.in/sitemap-zh.xml</loc></sitemap>
      <sitemap><loc>https://compile.ladestack.in/sitemap-pt-br.xml</loc></sitemap>
      ...
    </sitemapindex>
    ```

    Each `sitemap-{locale}.xml` lists absolute URLs for that locale only. Each `<url><loc>` may optionally include `<xhtml:link rel="alternate" hreflang=…>` inline mirrors of the head alternates (Google accepts sitemap as authoritative for hreflang). Prefer adding them — it compresses discovery.

  * **Option B — single sitemap with hreflang annotations.** Keep one `sitemap-0.xml` and annotate each entry with `<xhtml:link>` alternates. Simpler but harder to validate per-locale share.

* **Astro impl note:** `@astrojs/sitemap`'s default behavior scans built pages. After locale-prefixed builds (7× pages), it will naturally emit prefixed locs, but per-locale partitioning still requires a custom `serialize` hook or post-generation script that splits by first segment. Prompt 2 must implement the hook.

* **Editor sitemap stance:** `/editor` and `/editor/*` are app shells (authenticated-like, dynamic, no static content for crawlers). They should be **excluded** from sitemaps (noindex). Sitemaps belong only to web's static pages (`/`, `/blog/*`, `/faq`, `/privacy`, `/terms`). Do not sitemap `/editor` per locale either — prevents accidental indexing of app state (`/editor?share=`).

* **Robots.txt tie-in:** `/robots.txt` must `Sitemap: https://compile.ladestack.in/sitemap-index.xml` and (optionally) declare locale-allow directives. No `Disallow` per locale needed.

### 7.4 JSON-LD (`FAQPage`, `Article`, `BlogPosting`, etc.) — translated **per locale, not wrapped**

* **FAQPage** (`pages/faq.astro`): currently `JSON.parse → Question.name + Answer.text` embedded in one monolingual JSON-LD block. After i18n, each locale's build must emit JSON-LD whose `name` and `text` **match the visible language** on that URL. Therefore the FAQ source array must be locale-specific (from `src/i18n/faq/{locale}.json`), not a shared English array with a `inLanguage` wrapper. Each rendered document's `FAQPage` canonicalizes naturally because each locale URL has its own JSON-LD.

```html
<!-- /zh/faq -->
<script type="application/ld+json">{
  "@context":"https://schema.org","@type":"FAQPage","inLanguage":"zh",
  "mainEntity":[
    {"@type":"Question","name":"什么是 HTML 编译器？",
     "acceptedAnswer":{"@type":"Answer","text":"HTML 编译器是一个可让你在浏览器中编写 HTML…"}},
    ...
  ]
}</script>
```

* `inLanguage` property (BCP-47) is mandatory on each JSON-LD node after translation. Add `"inLanguage": "zh"` to `FAQPage` + each `Question`/`Answer` inherits.
* **Blog `Article` / `BlogPosting` schema** (`BlogPostLayout.astro`): similarly each `Article` JSON-LD block (author, datePublished, headline, image, ArticleBody snippet, tags) must be translated. `author` may remain English name but `headline`/`about`/`description`/`tags` must be the localized frontmatter. This implies the layout loads the collection entry for the active locale first.
* **BreadcrumbList** schema used in blog pages (`components/blog/Breadcrumbs.astro`) must also reflect localized breadcrumb labels (`Home`, `Blog` strings translated) and localized hrefs (English `/blog` vs Spanish `/zh/blog`).
* **Validation requirement:** Google's Rich Results Test will fail if JSON-LD text language mismatches `html[lang]`. CI should run a script extracting `JSON.parse(script[type=ld+json])` per built HTML and asserting `inLanguage == html[lang]`.

### 7.5 Other deferred SEO hygiene

* `<html lang=… dir=…>` per locale (`lang` = BCP-47: `en`, `zh`, `pt-BR`, `ru`, `ja`, `tr`, `ko`); `dir="ltr"` for all 7 (no RTL locales requiring `dir="rtl"` — future Arabic/Hebrew would add this branch).
* `meta name="language"` / `og:locale` alignment, `article:locale` if used.
* Per-locale `robots.txt` and `llms.txt` — these files remain at root (`/robots.txt`, `/llms.txt`) and are not locale-prefixed, but their contents should mention locale discovery links (or remain canonical English — robots spec does not support locale segments).
* Crawl budget: soft limiting at 7 locales (7× pages). At ~50 blog posts × 7 = 350 HTML files + 7×6 static pages ≈ 400 pages; safely within default crawl budget. No need for crawl-delay per locale.

---

## 8. Implementation Checklist for Prompts 2-5 — "No Code Yet, Authority Document"

This section assigns deferred code tasks to the subsequent prompts in the series and defines their shared acceptance criteria. Cross-references sections above show inputs; no implementation until Prompt 2+.

### 8.1 Prompt 2 — `apps/web` (Astro) i18n core

* [ ] Create `src/i18n/locales.ts` with `SUPPORTED_LOCALES`, `DEFAULT_LOCALE = "en"`, `LOCALE_TO_BCP47`, `LOCALE_TO_OG_LOCALE`, helpers `isLocale()`, `toBcp47()`, `localePath()`, `parseLocale()`.
* [ ] Create `src/middleware.ts`: parse locale, inject `Astro.locals.locale` + `Astro.locals.pathnameWithoutLocale`, handle `/en/*` 301 + lowercase normalization, sync `Set-Cookie: ladecompile_locale`.
* [ ] Restructure `src/content/blog/` into `src/content/blog/{en,zh,pt-br,ru,ja,tr,ko}/` (+ migration script for existing files into `/en/`) and update `src/content.config.ts` collections accordingly (`blog_en` …`blog_ko` or equivalent filter model — see §5.2). CI must gate that any post missing in a locale does not generate a path for that locale.
* [ ] Add `src/i18n/ui/{locale}.json` + `src/i18n/faq/{locale}.json` catalogs (stub English baseline, empty for others to be filled by translator) with key-diff gate `i18n:check-sync`.
* [ ] Rewrite `Header.astro`, `Footer.astro`, `BaseLayout.astro`, `SEO.astro`, `pages/index.astro`, `pages/faq.astro`, `pages/blog/index.astro`, `pages/blog/[...slug].astro`, `pages/404.astro`, and every `components/blog/*.astro` to consume the catalogs and locale path helper; `<html lang=…>`, `og:locale`, `Content-Language`.
* [ ] Implement `hreflang` (all locales + `x-default`) + per-locale self-canonical in `SEO.astro` / `BaseLayout` layout layer (see §7.1-7.2). Behavior: only emit alternates for locales where the page exists.
* [ ] Rework `@astrojs/sitemap` to emit per-locale sitemaps + `sitemap-index.xml` (see §7.3); verify in `dist/`.
* [ ] Translate JSON-LD per locale (`FAQPage` + `Article`) and set `inLanguage` (see §7.4).
* [ ] Add locale chooser UI to `Header.astro` (globe icon + language name) that lists all 7 locales, links via `localePath()`, sets cookie, and preserves current path equivalence (e.g. `/blog/slug` ↔ `/zh/blog/slug`). Include `aria-label` strings in catalog.
* [ ] Ensure static assets are not locale-prefixed and that local `astro dev` manual testing of `/zh/`, `/zh/faq`, `/zh/blog/*` is green.

### 8.2 Prompt 3 — `apps/editor` (Next.js) i18n UI

* [ ] Mirror `locales.ts` + `parseLocale` + `localePath` into `apps/editor/src/i18n/` (or `@/i18n`) kept in lockstep with web. Cookie name `ladecompile_locale`, `Path=/`, same expiry.
* [ ] Add `src/middleware.ts`: locale parse, `/en/*` 301, `/zh/editor` → `/editor` rewrite (preserve search/hash), set `x-ladecompile-locale`, reflect `Set-Cookie` if URL locale differs from cookie.
* [ ] Create `src/i18n/messages/{en,zh,pt-br,ru,ja,tr,ko}.json` (see §5.3) and thin helpers `loadDictionary(locale)`, `t(key, params)`; generate typed key list for lint. First pass: externalize every string in §6.2 checklist (120 keys) and keep keys identical across locales — missing key = render English fallback + CI error.
* [ ] Retrofit `app/layout.tsx` (html lang, metadata) + `components/editor/EditorShell.tsx` (all top bar, rail, dialogs, console, mobile barrier, toasts) + `app/error.tsx` + `app/not-found.tsx` to use `t()`; add Settings → Language picker that writes both cookie + `localStorage:ladecompile:locale` and triggers `router.replace(localePath(...))` preserving share query.
* [ ] Add globe/language chooser entry point(s) in header and Settings (see §6.2 E-17), with accessible name translated.
* [ ] Ensure `/_next/*` asset paths bypass locale logic; dev parity with `next dev` on `/zh/editor`.

### 8.3 Prompt 4 — Content & routing wiring (cross-app)

* [ ] Validate that `apps/editor/wrangler.jsonc` enumerated routes (see §2.3 code block) dispatch `/zh/editor`, `/pt-br/editor`, etc. to the editor Worker in a Cloudflare preview deploy. Smoke test: `curl -I https://preview.compile.ladestack.in/zh/editor` → `x-ladecompile-locale: zh`, no 404 from wrong Worker. Update `DEPLOYMENT_CHECKLIST.md` with the new route count.
* [ ] Confirm pre-render: `apps/web/dist/` contains `zh/{index.html,faq/index.html,blog/*}`, `pt-br/*`, etc. — missing file = fallback or blocked path under §5.2 policy. `astro build` must not emit `/en/*` mirrors.
* [ ] Provide translation pipeline hooks: script `scripts/i18n:check-sync` (catalog diff across web+editor), `scripts/i18n:missing` (reports missing blog markdown per locale) run in CI.
* [ ] Finalize privacy/legal pages: either generate per-locale `/privacy`, `/terms` (web) or formally defer with issue link and suppress the empty-log footer links.

### 8.4 Prompt 5 — QA, QA, QA (crawl, lint, accessibility)

* [ ] Add Playwright/Cypress matrix test: for each of 12 URLs (web: `/`, `/faq`, `/blog`, `/blog/slug`, `/404`; editor: `/editor`) × 7 locales (84 checks), assert: response language matches `html[lang]`, `hreflang[en/zh/pt-BR/ru/ja/tr/ko/x-default]` present/absent correctly, canonical is self, `og:locale` aligned, JSON-LD `inLanguage` equals `html[lang]`, filtered sitemap includes URL only if translated, KV share + hash share preserve locale.
* [ ] Lint: built HTML has no hard-coded untranslated English leakage on `/zh/*`; `Content-Language` header parity; cookie set on first locale visit carries `Path=/; Max-Age=31536000; SameSite=Lax; Secure`.
* [ ] Accessibility: voiceover in 7 locales reads `aria-label` translations; keyboard navigation unchanged.
* [ ] Rollout: staged launch strategy — ship with web+editor strings at English-only + two lead translation locales (e.g. zh + pt-br) first, verify indexing, then fill remaining ru/ja/tr/ko.

### 8.5 Non-goals (explicitly not in this blueprint's Prompts 2-5)

* RTL support, locale-specific typography tuning (CJK font stacks, punctuation-width fixes).
* Automatic machine translation — catalogs are hand-translated or vendor-supplied; scripts to call translation APIs may be in Prompt 4 pipeline but not auto-merged.
* Geo-IP routing or per-locale `Accept-Language` 302 auto-redirect at production edge (evaluate after crawl data; default is banner-only).
* Translating third-party rendered surfaces (Monaco Editor's own `vs/editor/contrib/find/...` labels, Cloudflare Pages error pages) — external.
* Reordering blog slugs for SEO (slug remains same across locales; translated title lives in frontmatter only).

---

## 9. Glossary — URLs, Tags, and Locale Forms

| Context | Locale form | Example |
|---------|-------------|---------|
| URL segment | lowercase BCP-47-ish | `/pt-br/faq` |
| `hreflang` attribute | canonical BCP-47 | `hreflang="pt-BR"` |
| `html lang=` / `Content-Language` header | BCP-47 | `lang="pt-BR"` / `Content-Language: pt-BR` (lowercase `pt-br` is technically valid per BCP-47 case-insensitivity, but use canonical cap) |
| `og:locale` | Facebook-style `ll_CC` | `pt_BR` |
| JSON catalog file name | lowercase file name | `pt-br.json` |
| Cookie value | lowercase | `pt-br` |
| TypeScript locale type | lowercase | `"pt-br"` |

---

## 10. Open Risks & Mitigations

* **Wrangler route count scaling.** 16 editor route patterns risk review blow-up if locale set grows. Mitigation: generate routes via `scripts/emit-wrangler-routes.ts` and keep checked-in `wrangler.jsonc` as its output. Cloudflare allows ≤ 100 zone routes — within limit at 7 locales × 2 + 1 catch-all = 15-17.
* **Slug drift across locales.** Translators may rename slugs (e.g. `onecompiler-alternatives-free-code-editor.md` → `onecompiler-替代品.md`). Mitigation: lock slug — file name stays identical across locales (translation only inside frontmatter/body); CI check `slug-parity` enforces filename set per locale equals `en`'s (minus optional drafts).
* **Fallback content duplication.** Accidentally shipping English under `/ru/blog/` plus again at `/blog/` with identical canonical would double-rank English. Mitigation: per §7, do not generate locale paths for untranslated slugs; strict fallback fallback-only with banner is gated by flag.

---

*This blueprint was drafted off the live snapshot at 2026-09-02: `apps/web/src/pages/index.astro:1-634`, `apps/web/src/pages/faq.astro:1-180`, `apps/web/src/components/Header.astro:1-93`, `apps/web/src/components/Footer.astro:1-64`, `apps/web/src/components/SEO.astro:1-77`, `apps/web/src/layouts/BaseLayout.astro:1-61`, `apps/web/src/content.config.ts:1-32`, `apps/web/astro.config.mjs:1-24`, `apps/web/wrangler.jsonc:1-23`, `apps/editor/src/app/layout.tsx:1-105`, `apps/editor/src/components/editor/EditorShell.tsx:1-1500+`, `apps/editor/wrangler.jsonc:1-33`.*

