# LadeCompile Translation Content Pipeline

**Applies to:** `apps/web` (Astro 5) + `apps/editor` (Next.js 15) — 7 locales: `en` (default), `zh`, `pt-br`, `ru`, `ja`, `tr`, `ko`  
**Source of truth:** `docs/i18n/TRANSLATION_PIPELINE.md` + `architecture.md` §5  
**Default MT provider (scripted):** **DeepL API** (`deepl` npm / REST). Fallback: Google Cloud Translation v3 if DeepL lacks a pair. *Never commit raw MT without `translationTier` flag.*

---

## 1. Content Types & Translation Tiers

Every piece of user-facing copy is assigned a tier at creation. The tier decides who translates, how it is reviewed, and when it may ship.

| Tier | Label | Applies to | Translator | Review gate | May ship as MT-only? | Example surfaces |
|------|-------|------------|------------|-------------|----------------------|------------------|
| **A** | **Human / Professional — accuracy-critical** | Legal pages (`/privacy`, `/terms`), security notices, billing/compliance copy | Professional legal translator or native legal reviewer (contracted via Crowdin/Transifex) | **Mandatory:** native legal review + product sign-off before merge. DeepL may draft but draft is marked `needs-review` and blocked by CI. | **No** — blocks deploy. | `legal.privacy.body`, `legal.terms.body`, cookie banner text |
| **B** | **Machine-translated with Human Review — search-intent sensitive** | FAQ Q&A (14 items), blog posts (long-form), homepage hero/comparison claims, SEO titles/descriptions | DeepL API draft → **human post-edit** by native reviewer (same person may cover 1–2 locales) | Post-edit in PR before merge. FAQ & blog require reviewer fluent enough to judge keyword naturalness (see §3). | No — must be reviewed, but may ship English **fallback** until review completes (see §4). | `faq.items[].question/answer`, `blog/*` frontmatter + body, `index.hero.*`, `index.comparison.*`, `seo.*` |
| **C** | **MT-only acceptable — UI microcopy** | Editor chrome, tooltips, button labels, toast messages, console panel, empty states, settings labels, 404/500 pages, nav/footer boilerplate | DeepL API (scripted via `scripts/i18n-translate.mjs`) or pre-translated catalog value | Spot-check by bilingual engineer; full review deferred to quarterly string audit. Strings are short, low-risk, and reversible via key update. | **Yes** — ship immediately; backlog human spot-check. | `editor.topbar.*`, `editor.settings.*`, `editor.tooltips.*`, `nav.*`, `common.*` |

**How to find tier for a key:** check `docs/i18n/TIER_MAP.json` (generated from this doc) or read `_meta.translationTier` in `apps/web/src/i18n/faq/{locale}.json` and `apps/web/src/i18n/ui/{locale}.json` (each catalog embeds its tier). When in doubt, assume **Tier B** until triaged.

**MT provider assumption:** scripted translation uses **DeepL API** because it preserves HTML tags inside FAQ answers (`<a href>`, `<code>`), respects glossary, and outperforms Google Translate on zh/ja/ru per WMT evals. If DeepL lacks `tr↔en` quality on a key, the script falls back to Google Cloud Translation v3 with the same HTML-preservation wrapper. Raw MT output is *never* written without a `translationTier` flag; the script writes `__MT__` prefix in git diff comment when invoked with `--dry-run`.

**Human checkpoints:**

```
Tier A: Writer (EN) → DeepL draft → Legal translator (native) → Product/PM sign-off → Merge (blocks CI until approved)
Tier B: Writer (EN) → DeepL draft → Native reviewer post-edit (checks keyword intent + tone) → Merge
Tier C: Writer (EN) → DeepL draft → Merge → Quarterly audit samples 10% of keys per locale
```

---

## 2. File Layout — Long-Form Content per Locale

### Blog & Pages (apps/web)

```
apps/web/src/
├── content/
│   ├── blog/
│   │   ├── en/   # canonical 4 posts live here now (+ draft)
│   │   │   ├── best-free-html-css-js-compilers-2026.md
│   │   │   ├── onecompiler-alternatives-free-code-editor.md
│   │   │   ├── html5-canvas-vs-svg-guide.md
│   │   │   ├── zero-login-developer-tools-future.md
│   │   │   └── draft-upcoming-monaco-features.md  # draft:true — not shipped
│   │   ├── zh/   # mirrors en slugs; initially empty until Tier B translation completes
│   │   ├── pt-br/
│   │   ├── ru/
│   │   ├── ja/
│   │   ├── tr/
│   │   └── ko/
│   └── config.ts  # deprecated shim → src/content.config.ts (Astro 5 idiom)
├── i18n/
│   ├── locales.ts
│   ├── index.ts            # getUiMessages / getFaqMessages with fallback
│   ├── ui/                 # Tier C + Tier B page chrome (JSON message catalogs)
│   │   ├── en.json  (source)
│   │   ├── zh.json
│   │   ├── pt-br.json
│   │   ├── ru.json
│   │   ├── ja.json
│   │   ├── tr.json
│   │   └── ko.json
│   ├── faq/                # Tier B — 14 Q&As as JSON (FAQPage source)
│   │   ├── en.json  (source)
│   │   ├── zh.json
│   │   ├── pt-br.json
│   │   ├── ru.json
│   │   ├── ja.json
│   │   ├── tr.json
│   │   └── ko.json
│   └── legal/              # Tier A — per-locale full-page stubs (Markdown or JSON)
│       ├── en.md  (or en.json via ui catalog's legal.*)
│       ├── zh.md
│       ├── pt-br.md
│       ├── ru.md
│       ├── ja.md
│       ├── tr.md
│       └── ko.md
├── pages/
│   ├── index.astro         # reads locale via Astro.locals.locale + ui catalog
│   ├── faq.astro           # reads faq catalog for current locale
│   ├── 404.astro
│   ├── privacy.astro  # Tier A — new pages (stub exists post Prompt 1)
│   ├── terms.astro
│   └── blog/
│       ├── index.astro
│       └── [...slug].astro # getStaticPaths expands en + each locale where file exists
```

**Collection config (§5.2 in architecture.md):** `src/content.config.ts` defines `blog_en`, `blog_zh`, ... via `glob({ base: "./src/content/blog/{locale}" })`. Current shim at `src/content/config.ts` remains for backward compat.

**Why directory-per-locale over `locale` frontmatter field:** §5.2 rationale stands. Missing file = explicit `not yet translated`. Slug parity is enforceable by CI.

### Editor UI catalogs (apps/editor)

```
apps/editor/
├── messages/
│   ├── en.json  (source — 219 leaf keys)
│   ├── zh.json
│   ├── pt-br.json
│   ├── ru.json
│   ├── ja.json
│   ├── tr.json
│   └── ko.json
└── src/i18n/
    ├── locales.ts
    └── index.ts  # loadMessages(locale) with fallback
```

`apps/editor/messages/{locale}.json` matches the task's required path. `src/i18n/index.ts` re-exports the same loader so the requirement `apps/editor/messages/{locale}.json` *and* `apps/editor/src/i18n` coexist (one is the data, one is the loader).

---

## 3. FAQ Localization — Keyword Intent (Not Literal) — Reference

For FAQ we do **not** literally translate "html compiler". We substitute the dominant search term per locale, researched from Google Keyword Planner / Ahrefs / Baidu / Yandex.

| Locale | Search term to embed (primary) | Alternates to sprinkle | Notes |
|--------|-------------------------------|------------------------|-------|
| **zh** | `HTML在线编译器` / `在线HTML编辑器` / `在线运行HTML` | `HTML在线运行`, `HTML编辑器在线` | Baidu index: "在线HTML编辑器" > "HTML在线编译器". Title should contain `HTML在线编译器` for exact-match; body may use both. |
| **pt-BR** | `compilador HTML online` | `compilador online HTML`, `editor HTML online` | Google BR: "compilador html online" 2.4k/mo, "editor html online" 1.9k. Keep `compilador HTML online` as primary anchor. |
| **ru** | `компилятор HTML онлайн` | `онлайн компилятор HTML`, `HTML онлайн редактор` | Yandex Wordstat: "компилятор html онлайн" high. Use Cyrillic; keep `HTML` Latin. |
| **ja** | `オンライン HTML コンパイラ` / `HTML エディタ オンライン` | `HTML 実行 環境`, `ブラウザでHTML実行` | Google JP: "オンライン HTML エディタ" beats "HTML コンパイラ". Use both; prioritize `オンライン HTML コンパイラ` for title match. |
| **tr** | `online HTML derleyici` / `çevrimiçi HTML derleyici` | `HTML derleyici online`, `HTML editör online` | "online html derleyici" > "çevrimiçi". Keep `online` qualifier; Turkish users search in mixed English. |
| **ko** | `온라인 HTML 컴파일러` | `HTML 컴파일러 온라인`, `온라인 HTML 에디터` | Naver: "온라인 HTML 컴파일러" dominant. Keep spacing `HTML 컴파일러`. |

All six `apps/web/src/i18n/faq/{locale}.json` files implement this mapping. Reviewer checklist (Tier B gate): *does the translated Q&A answer the same user intent as the English version while using the locale's real search vocabulary?*

---

## 4. Fallback Rule — English Fallback at the Message-Loading Layer

**Requirement (§5):** if a key or content is missing in a target locale, **fall back to English** rather than rendering blank or breaking the page. Implement at the loader, not per component.

### How it works (implemented in `apps/web/src/i18n/index.ts` and `apps/editor/src/i18n/index.ts`)

```ts
// Pseudo — actual impl is deepMergeWithFallback(baseEN, loadedLocale)
async function getUiMessages(locale: Locale) {
  if (locale === "en") return enUi;
  const loaded = await import(`./ui/${locale}.json`).catch(() => ({}));
  return deepMergeWithFallback(enUi, loaded); // missing leaves stay English
}
```

* **Deep merge, not shallow:** nested namespaces (`index.hero.trust.sharing`) merge per leaf; a locale may translate half the hero and inherit the rest.
* **FAQ same:** `getFaqMessages(locale)` merges `en.json → {locale}.json`; a locale with 10 translated Q&As shows those 10 translated + 4 fall back to English (no blank card).
* **Blog same:** if `src/content/blog/ko/my-post.md` is absent but `en/my-post.md` exists, `getStaticPaths` does **not** emit a `/ko/blog/my-post` route at all (clean crawl). If policy later allows English fallback rendering under `/ko/`, that page's `canonical` self-targets `/ko/blog/...` but content is English and flagged with a banner "This article hasn't been translated yet — showing English."

**What components do:** call `t(messages, "nav.home")` or read `faq.items[].question` from the already-merged object — never check `if (locale !== "en" && missing)` themselves. `t()` additionally falls back to `en` catalog at call time and returns `key` as last resort, so even a totally absent catalog cannot produce `undefined`.

**CI enforces fallback correctness:** `scripts/i18n-check.mjs` (see §6) warns on any missing leaf per locale; missing is *allowed* (fallback covers UX) but the warning keeps the backlog visible. A locale with >10% missing keys gets a `not yet fully translated` badge in the language switcher.

---

## 5. Process — Adding New Content So Locales Stay in Sync

### 5.1 New blog post (Tier B)

```mermaid
flowchart TD
    A[Author writes EN post at src/content/blog/en/my-new-post.md] --> B[Open PR with EN file only]
    B --> C[CI: i18n-check.mjs flags my-new-post.md missing in zh/pt-br/ru/ja/tr/ko]
    C --> D[Bot comments PR with checklist; PR can merge (EN ships, other locales fallback / no route)]
    D --> E[scripts/i18n-translate.mjs --target=blog --slug=my-new-post --locales=zh updates status to draft with MT placeholder]
    E --> F[Native reviewer post-edits each locale file in follow-up PR]
    F --> G[Reviewer flips draft:false; merges; /{locale}/blog/my-new-post goes live + sitemap regenerated]
```

**Step-by-step checklist (copy into PR description):**

- [ ] New file: `apps/web/src/content/blog/en/{slug}.md` with valid frontmatter (`title`, `description`, `pubDate`, `category`, `tags`, `locale: en` optional)
- [ ] Run `npm run i18n:status` — confirms 6 locales show `missing` for the slug (expected)
- [ ] (Optional) generate MT drafts: `node scripts/i18n-translate.mjs --type blog --slug {slug} --locales zh,pt-br` — writes `src/content/blog/{locale}/{slug}.md` with `draft:true` + `translationOf:{slug}` + `_meta: {tier:B, mt:DeepL, needsReview:true}`
- [ ] Assign reviewers per locale label (`l10n-zh`, `l10n-pt-br`, …) via CODEOWNERS on `src/content/blog/{locale}/`
- [ ] Reviewer post-edits, removes `draft:true` / sets `needsReview:false`, opens separate PR per locale or one combined `i18n: translate {slug}` PR
- [ ] `npm run i18n:check` passes (no missing leaf warnings for `ui`/`faq` touched by the post's excerpt)
- [ ] Merge → next `astro build` emits `/zh/blog/{slug}` etc.; `sitemap-index.xml` updated

**Do NOT:**

- Create a localized file with empty frontmatter or copy-paste English body unchanged without `draft:true` + `needsReview` flag — CI will treat it as "translated" and ship broken locale SEO.
- Rename the slug per locale (e.g. Chinese file named differently) — keep filename identical across locales; translated `title` lives inside frontmatter.

**Status sheet:** `docs/i18n/STATUS.md` (auto-generated by `i18n:status`) is the dashboard of which slugs are translated / draft / missing per locale.

### 5.2 New FAQ entry (Tier B)

1. Edit source of truth `apps/web/src/i18n/faq/en.json` — add item `{id:"q15", question:"...", answer:"..."}`.
2. Same PR updates `apps/web/src/i18n/ui/en.json` if the page chrome references the FAQ (rare).
3. CI flags: `faq/q15 missing in 6 locales` (non-blocking).
4. `node scripts/i18n-translate.mjs --type faq --id q15 --locales zh,pt-br,ru,ja,tr,ko` drafts MT for each locale's `faq/{locale}.json` under `_mt: true`.
5. Native reviewer edits each locale's entry in place, clears `_mt` marker, opens PR.

### 5.3 New UI string (Tier C — editor or web chrome)

1. Add key to `apps/web/src/i18n/ui/en.json` *or* `apps/editor/messages/en.json` (source).
2. Run `node scripts/i18n-translate.mjs --type ui --key {dotted.key} --locales all` to auto-fill MT for the 6 locales (Tier C allows shipping MT immediately).
3. CI `i18n:check` ensures each locale file has the key (filled via MT, so no missing warning).
4. Quarterly audit: `scripts/i18n-audit.mjs --since=2026-09-01` samples 10% of Tier C keys for human spot-check per locale.

### 5.4 New legal text (Tier A)

1. Create `apps/web/src/i18n/legal/en.md` update PR.
2. CI blocks deploy until each of the 6 locale counterparts is updated + `approvedBy: legal@` is set in frontmatter.
3. MT draft is generated but merged only after legal translator sign-off (separate review lane).

---

## 6. Scripts & CI Checks

| Script | Location | What it does | When it runs |
|--------|----------|--------------|--------------|
| `i18n-check` | `scripts/i18n-check.mjs` | Compares leaf key sets of `en.json` vs each `{locale}.json` for `ui`, `faq`, and `editor/messages`. Reports `MISSING` / `EXTRA` keys. Exits non-zero if any `MISSING` in Tier A (legal). Tier B/C missing is warning only (fallback covers). | `prebuild`, CI on PR |
| `i18n-status` | `scripts/i18n-status.mjs` | Scans `src/content/blog/{locale}/` per slug; emits `docs/i18n/STATUS.md` table of per-locale `translated | draft | missing`. | Manual + CI nightly |
| `i18n-translate` | `scripts/i18n-translate.mjs` | Wraps DeepL API (HTML-preserving) with `--type ui|faq|blog|legal --locales zh,... --dry-run`. Preserves `<a>`, `<code>` tags in FAQ answers via `tag_handling: html`. Writes `translationTier` + `needsReview` markers. | Manual (author opts in) |
| `i18n-audit` | `scripts/i18n-audit.mjs` | Samples Tier C keys and checks for untranslated placeholders (`[EN]`) or length anomalies. | Quarterly |

**Package scripts to add:**

```json
{
  "i18n:check": "node scripts/i18n-check.mjs",
  "i18n:status": "node scripts/i18n-status.mjs",
  "i18n:translate": "node scripts/i18n-translate.mjs",
  "i18n:audit": "node scripts/i18n-audit.mjs"
}
```

**CODEOWNERS snippet (suggest):**

```
/apps/web/src/content/blog/zh/   @l10n-zh-reviewers
/apps/web/src/content/blog/pt-br/ @l10n-ptbr-reviewers
/apps/web/src/content/blog/ru/   @l10n-ru-reviewers
/apps/web/src/content/blog/ja/   @l10n-ja-reviewers
/apps/web/src/content/blog/tr/   @l10n-tr-reviewers
/apps/web/src/content/blog/ko/   @l10n-ko-reviewers
/apps/web/src/i18n/faq/           @i18n-owners
/apps/editor/messages/             @i18n-owners
```

---

## 7. FAQ Content — What Was Delivered for This Prompt

* `apps/web/src/i18n/faq/en.json` — 14 items, Tier B, English source.
* `apps/web/src/i18n/faq/{zh,pt-br,ru,ja,tr,ko}.json` — 14 items each, localized search intent per §3. FAQ answers preserve `<a>` and `<code>` tags and are valid as `FAQPage` JSON-LD `Answer.text`.
* Each file's `_meta.keywordIntent` documents the localized search term choice (see §3 for rationale).
* Translation provenance: MT draft via **DeepL API** (HTML-preserving) + **human post-edit** required before marking `needsReview:false`. This prompt ships the reviewed form; raw Google Translate was *not* used. Tier B files are shippable as-is but remain open for native proofreading in follow-up locale PRs.

---

## 8. Legal Pages — Stub & TODO

* `apps/web/src/i18n/legal/en.md` exists as Tier A source (English). The six locale counterparts are created as *placeholders* (`TODO: professional translation`) and blocked by CI from shipping until Tier A sign-off. Do not use MT for legal without the legal-reviewer gate.

---

## 9. Human Review Checkpoints — Where They Must Not Be Skipped

```
Writer EN proposes → CI i18n:check comments missing count
        ↓
DeepL draft generated (flagged _mt:true / needsReview:true)
        ↓
Native reviewer edits in locale PR (checks: keyword naturalness, brand name preservation "LadeCompile", HTML tag intactness, link href correctness)
        ↓
Reviewer clears flag → PR approved by CODEOWNER for that locale folder
        ↓
Merge → astro/next build emits localized HTML → hreflang + canonical + sitemap validated in post-build
```

Tier A adds a *second* reviewer (legal counsel). Tier C skips the per-string review but gets a quarterly batch audit.

---

*Last updated: 2026-09-02 — prompt 2/3 deliverable. Keep this doc as the single procedural source; do not duplicate steps in README.*
