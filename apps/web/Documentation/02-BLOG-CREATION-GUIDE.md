# 02 — Blog Creation & Frontmatter Guide

This guide explains how to write and configure blog posts in the LadeCompile marketing website.

---

## 1. Where to Create Blog Files

All blog articles must be created inside the following directory:

```
apps/web/src/content/blog/
```

> ⚠️ **Important**: Do **not** create blog Markdown files outside this folder. Astro's content collection specifically scans `src/content/blog/`.

---

## 2. Filename Convention & URL Mapping

The name of your Markdown file directly determines the public URL slug:

$$\text{Filename: } \texttt{src/content/blog/}\mathbf{my-article-name}\texttt{.md} \implies \text{URL: } \texttt{https://compile.ladestack.in/blog/}\mathbf{my-article-name}\texttt{/}$$

### Naming Rules:
- **Lowercase only**: `my-new-post.md` (not `My-New-Post.md`).
- **Hyphens for spaces**: `zero-login-tools.md` (not `zero_login_tools.md` or `zero login tools.md`).
- **No special characters**: Avoid commas, apostrophes, colons, or question marks in filenames.
- **Descriptive & keyword-rich**:
  - ✅ `best-html-compilers-2026.md`
  - ❌ `article1.md`
  - ❌ `draft_v2_final.md`

---

## 3. Complete Frontmatter Reference Table

Every Markdown file must begin with a YAML frontmatter block enclosed by three hyphens (`---`):

```yaml
---
title: "Article Headline"
description: "Short SEO description"
pubDate: 2026-09-01
category: "Web Development"
tags: ["html", "css"]
draft: false
---
```

### All Supported Fields

| Field | Type | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`title`** | `string` | **Yes** | — | Headline of the post. Used as page title, SEO title, and H1. |
| **`description`** | `string` | **Yes** | — | 140–160 character summary for search engines and social cards. |
| **`pubDate`** | `date` | Optional | Build Date | Publication date (`YYYY-MM-DD`). |
| **`updatedDate`** | `date` | Optional | — | Last modified date (`YYYY-MM-DD`). Shows "Updated on" badge. |
| **`author`** | `string` | Optional | `"LadeStack Team"` | Author name displayed on post header and card. |
| **`image`** | `string` | Optional | `"/favicon.svg"` | Banner image path in `public/` (e.g. `"/blog/my-img.svg"`). |
| **`imageAlt`** | `string` | Optional | `"LadeCompile article banner"` | Screen-reader alt text for the banner image. |
| **`category`** | `string` | Optional | `"Web Development"` | Main topic category. Used for category badges and filtering. |
| **`tags`** | `array` | Optional | `[]` | List of keywords used for tags and related article matching. |
| **`draft`** | `boolean`| Optional | `false` | If `true`, hides the post from production builds and sitemaps. |
| **`featured`** | `boolean`| Optional | `false` | If `true`, highlights the post in the featured spotlight banner. |
| **`canonicalURL`** | `string` | Optional | `""` | Optional external canonical URL if syndicated from another site. |

---

## 4. Detailed Field Explanations

### `title` (Required)
The primary headline of your article. Keep it under 65 characters for optimal Google search snippet rendering.
- **Example**: `title: "HTML5 Canvas vs SVG: Performance Breakdown"`

### `description` (Required)
A compelling summary of the article. This becomes the `<meta name="description">` and Open Graph description. Aim for 120–160 characters.
- **Example**: `description: "Explore the architectural differences, DOM performance limits, and rendering tradeoffs between Canvas and SVG."`

### `pubDate` (Optional)
The date the article was first published. Standard format is `YYYY-MM-DD`.
- **Example**: `pubDate: 2026-08-30`

### `updatedDate` (Optional)
If you revise or update an older article with new information, add `updatedDate`. The article page will display an "Updated <date>" badge.
- **Example**: `updatedDate: 2026-09-05`

### `author` (Optional)
The author's full name.
- **Example**: `author: "Girish Lade"`

### `image` & `imageAlt` (Optional)
Path to the article hero banner image stored inside `apps/web/public/blog/`. Always begin the path with `/blog/`.
- **Example**:
  ```yaml
  image: "/blog/canvas-vs-svg.svg"
  imageAlt: "Diagram comparing HTML5 Canvas raster pixels and SVG vector nodes"
  ```

### `category` (Optional)
The primary high-level topic. Recommended standard categories for LadeCompile:
- `Compilers`
- `Web Development`
- `Engineering`
- `Comparisons`
- `Tutorials`
- `Product`

### `tags` (Optional)
A list of specific keywords used to score related articles.
- **Example**:
  ```yaml
  tags:
    - html5
    - canvas
    - svg
    - performance
  ```

### `draft` (Optional)
Set `draft: true` while working on an unfinished article. Draft articles are automatically hidden from:
- Production builds (`npm run build:web`)
- Blog listing page (`/blog/`)
- Related posts recommendations
- XML Sitemap (`sitemap-0.xml`)

When ready to publish, simply change to `draft: false`.

### `featured` (Optional)
Set `featured: true` on your most important or flagship article. It will be showcased in a prominent wide-banner spotlight at the top of the `/blog/` listing.

---

## 5. Image Placement & Guidelines

### File Location:
All blog images must be saved into:
```
apps/web/public/blog/
```

### Formats & Dimensions:
- **Formats**: `.svg` (vector), `.webp` (compressed modern raster), or `.png`.
- **Recommended Aspect Ratio**: `16:9` (e.g. `1200 x 675 px` or `800 x 450 px`).
- **File size**: Keep raster images under `150 KB` for fast loading.

### Referencing in Markdown Content:
To include an inline image inside your article body:
```markdown
![Architecture Diagram](/blog/my-inline-diagram.svg)
```

---

## 6. Markdown Content Formatting Rules

### Rule 1: Never Add `# H1` Inside the Markdown Body
Astro automatically renders your frontmatter `title` as the single `<h1>` on the page. Having two `<h1>` headings hurts SEO.
- ❌ **Wrong**: `# My Article Title` at line 1 of Markdown.
- ✅ **Correct**: Start your first section with `## Introduction` (`<h2>`).

### Rule 2: Use Headings for Table of Contents
Headings using `## H2` and `### H3` are automatically picked up by the **Table of Contents** component.
- `## Main Topic` $\to$ Main TOC link.
- `### Subtopic` $\to$ Indented TOC link.

### Rule 3: Code Blocks with Language Highlighting
Always specify the programming language on fenced code blocks for syntax highlighting:
````markdown
```html
<button class="btn">Click me</button>
```

```javascript
const count = 0;
console.log(count);
```
````

### Rule 4: Internal Links
When linking to other pages on LadeCompile, use relative URLs:
- Link to editor: `[Open the Web Editor](/editor)`
- Link to starters: `[Browse Templates](/#starters)`
- Link to another blog post: `[Read our Canvas guide](/blog/html5-canvas-vs-svg-guide/)`
