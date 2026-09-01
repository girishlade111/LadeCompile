# 05 — Local Development & Testing Commands

This document lists all available commands in the repository for running, building, testing, and verifying the blog system.

---

## 1. Monorepo Command Quick Reference

All commands can be executed directly from the root of the repository (`c:\Users\Girish Lade\Downloads\LadeCompile`):

| Goal | Command | Description |
| :--- | :--- | :--- |
| **Start Astro Blog Website** | `npm run dev:web` | Starts the Astro marketing website on `http://localhost:4321`. |
| **Start Next.js Editor App** | `npm run dev:editor` | Starts the Next.js online compiler app on `http://localhost:3000`. |
| **Start Both Apps in Parallel** | `npm run dev:all` | Runs both Astro (`:4321`) and Next.js (`:3000`) concurrently. |
| **Build Blog Website** | `npm run build:web` | Compiles Markdown files into static HTML in `apps/web/dist/`. |
| **Build Entire Monorepo** | `npm run build` | Builds both Next.js and Astro workspaces for production. |
| **Deploy Web App** | `npm run deploy:web` | Deploys the built website to Cloudflare Pages via Wrangler. |

---

## 2. Running the Blog Locally

To start writing and previewing articles live:

```bash
# From repository root:
npm run dev:web
```

### Local URLs:
- **Blog Home**: `http://localhost:4321/blog/`
- **Marketing Home**: `http://localhost:4321/`
- **Any Article**: `http://localhost:4321/blog/<your-article-slug>/`

> 💡 **Hot Module Replacement (HMR)**: Astro watches for changes in `src/content/blog/`. When you edit and save a Markdown file, your browser updates instantly without a manual page refresh.

---

## 3. Verifying the Production Build

Before pushing changes to GitHub, always run the production build to ensure there are no frontmatter schema errors:

```bash
npm run build:web
```

### What to Look For in the Build Output:
1. **Content Syncing**:
   ```
   [content] Syncing content
   [content] Synced content
   ```
2. **Static Prerendering**:
   ```
   prerendering static routes
   ▶ src/pages/blog/[...slug].astro
     ├─ /blog/your-article-slug/index.html
   ```
3. **Sitemap Generation**:
   ```
   [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
   ```
4. **Completion**:
   ```
   [build] Complete!
   ```

---

## 4. How to Verify Draft Article Exclusion

To verify that an article with `draft: true` is properly protected:

1. Create a test file: `apps/web/src/content/blog/test-draft.md`.
2. Add `draft: true` to its frontmatter.
3. Run `npm run build:web`.
4. Check the `apps/web/dist/blog/` directory:
   - Notice that `test-draft` folder is **NOT** created.
5. Check `apps/web/dist/sitemap-0.xml`:
   - Notice that `/blog/test-draft/` is **NOT** present in the sitemap.

---

## 5. Type Checking & Code Validation

The project uses TypeScript with strict mode enabled in `apps/web/tsconfig.json`.

To run Astro's internal type check:

```bash
# Inside apps/web directory:
npx astro check
```

This verifies that all frontmatter schemas, Astro component props, and utility helper functions satisfy TypeScript constraints.
