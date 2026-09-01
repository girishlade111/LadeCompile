# 01 — System Architecture & Pipeline Deep Dive

This document explains the technical architecture of the LadeCompile Blog System, how data flows through the build process, and how Astro converts plain Markdown files into production-grade, SEO-optimized static HTML pages.

---

## 1. High-Level Architecture Overview

The blog system follows a **Content-Driven Static Site Generation (SSG)** model powered by Astro 5:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Markdown Source Files (src/content/blog/*.md)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Astro 5 Content Layer (src/content.config.ts)            │
│    - Loads files via glob loader                            │
│    - Validates schema with Zod                              │
│    - Type safety & normalization                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Universal Dynamic Router (src/pages/blog/[...slug].astro)│
│    - getStaticPaths() gathers published posts               │
│    - Filters out drafts in production                       │
│    - Maps filenames to clean URLs (/blog/<slug>/)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Reusable Layout & Components (BlogPostLayout.astro)      │
│    - BlogHeader & Breadcrumbs                               │
│    - TableOfContents (auto-extracted H2/H3)                 │
│    - Tailwind Typography Prose Container                    │
│    - SaaSCta (live compiler link)                           │
│    - PrevNextNav & RelatedPosts Engine                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Automated SEO & Structured Data (SEO.astro)              │
│    - Canonical URL & Open Graph Protocol                    │
│    - Twitter/X Summary Cards                                │
│    - Schema.org BlogPosting & BreadcrumbList JSON-LD        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Build Outputs (dist/blog/)                               │
│    - 100% Static HTML + CSS                                 │
│    - Automated Sitemap (dist/sitemap-0.xml)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The Astro 5 Content Layer (`src/content.config.ts`)

In Astro 5, content collections use the **Content Layer API**. Rather than hardcoding individual routes, the entire collection is declared once in `src/content.config.ts`:

```typescript
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z
    .object({
      title: z.string().min(1, "Article title is required"),
      description: z.string().min(1, "Article description is required"),
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
    })
    .transform((data) => ({
      ...data,
      // Normalizes pubDate and publishDate interchangeably
      pubDate: data.pubDate ?? data.publishDate ?? new Date(),
      // Normalizes image and heroImage interchangeably
      image: data.image ?? data.heroImage ?? "/favicon.svg",
    })),
});

export const collections = { blog };
```

### Why this is powerful:
1. **Strong Type Safety**: If a writer forgets a required field (like `title`), Astro will throw a descriptive build error pointing to the exact line number.
2. **Schema Normalization**: `transform()` automatically resolves backwards-compatible fields (`pubDate` vs `publishDate`) without breaking older articles.
3. **Draft Exclusion**: Enables strict filtering so unpublished drafts never leak into production.

---

## 3. The Universal Dynamic Route (`src/pages/blog/[...slug].astro`)

Instead of creating `article-1.astro`, `article-2.astro`, etc., a single dynamic route template handles **all** current and future articles:

```astro
---
import { getCollection, render } from "astro:content";
import BlogPostLayout from "../../layouts/BlogPostLayout.astro";
import { filterPublishedPosts, getPostSlug } from "../../utils/blog";

export async function getStaticPaths() {
  const allPosts = await getCollection("blog");
  // Exclude draft posts in production builds
  const publishedPosts = filterPublishedPosts(allPosts, false);

  return publishedPosts.map((post) => ({
    params: { slug: getPostSlug(post) },
    props: { post, allPosts: publishedPosts },
  }));
}

const { post, allPosts } = Astro.props;
const { Content, headings } = await render(post);
---

<BlogPostLayout post={post} headings={headings} allPosts={allPosts}>
  <Content />
</BlogPostLayout>
```

### How `getStaticPaths()` works:
1. At build time, Astro executes `getStaticPaths()`.
2. Astro scans all `.md` files in `src/content/blog/`.
3. It filters out drafts where `draft: true`.
4. It extracts the filename slug (e.g. `html5-canvas-vs-svg-guide.md` $\to$ `html5-canvas-vs-svg-guide`).
5. It renders the Markdown into HTML (`<Content />`) and passes extracted headings (`<h2>`, `<h3>`) into `BlogPostLayout`.

---

## 4. Modular UI Component Breakdown

The blog system is divided into modular, single-responsibility components in `src/components/blog/`:

### 1. `BlogHeader.astro` & `Breadcrumbs.astro`
- Renders the structured breadcrumb navigation (`Home > Blog > Article Title`).
- Renders the single `<h1>` title of the page.
- Injects `BreadcrumbList` schema metadata into `<head>`.

### 2. `BlogMeta.astro`
- Displays the category badge (`#aa2d00`).
- Displays the author name with icon.
- Displays publication and last updated dates.
- Displays the automated reading time badge (e.g., `4 min read`).

### 3. `TableOfContents.astro`
- Automatically extracts `<h2>` and `<h3>` headings from the rendered Markdown.
- Automatically generates anchor links (e.g., `#understanding-the-core-graphic-paradigms`).
- Provides clean nested styling (H3 indented under H2) with zero client-side JavaScript.

### 4. `SaaSCta.astro`
- High-converting conversion banner styled in LadeCompile's signature warm cream (`#f5e9d4`).
- Links directly to the live compiler at `/editor` without login friction.

### 5. `RelatedPosts.astro` (Recommendation Engine)
Deterministic scoring algorithm based on content tags and category:
- Matching category: **+3 points**
- Matching tag: **+1 point per tag**
- Current post: **Excluded**
- Drafts: **Excluded**
- Sorted by highest score descending, then by publication date.

### 6. `PrevNextNav.astro`
- Renders "Previous Article" and "Next Article" cards chronologically.

---

## 5. Automated SEO, Open Graph & Structured Data

Every article automatically generates comprehensive SEO tags through [`SEO.astro`](file:///c:/Users/Girish%20Lade/Downloads/LadeCompile/apps/web/src/components/SEO.astro):

### Generated Meta Tags:
- `<title>`: `Article Title | LadeCompile`
- `<meta name="description">`: Frontmatter description
- `<link rel="canonical">`: `https://compile.ladestack.in/blog/<slug>/`
- `<meta property="og:type" content="article">`
- `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`
- `<meta property="article:published_time">`, `<meta property="article:modified_time">`
- `<meta property="article:author">`, `<meta property="article:tag">`
- `<meta name="twitter:card" content="summary_large_image">`

### Generated JSON-LD Structured Data:
1. **`BlogPosting`**:
   - `headline`, `description`, `datePublished`, `dateModified`, `author`, `publisher`, `mainEntityOfPage`, `image`.
2. **`BreadcrumbList`**:
   - Hierarchical trail for Google rich snippets.

---

## 6. Sitemap Integration

The `@astrojs/sitemap` integration is configured in `apps/web/astro.config.mjs`. 

During every production build (`npm run build:web`):
- Astro compiles all public static routes into `dist/`.
- `@astrojs/sitemap` inspects all rendered HTML pages and writes `dist/sitemap-index.xml` and `dist/sitemap-0.xml`.
- Because draft posts are filtered out during prerendering, **draft URLs are never included in the sitemap**.
