# 04 — Publishing Workflow (Step-by-Step)

This document provides a beginner-friendly, step-by-step checklist to take an article from an initial idea to a live published web page.

---

## The 10-Step Publishing Pipeline

```
[1. Create .md file] 
         │
         ▼
[2. Copy Template & Fill Frontmatter]
         │
         ▼
[3. Write Article in Markdown]
         │
         ▼
[4. Place Banner Image in public/blog/]
         │
         ▼
[5. Set draft: false]
         │
         ▼
[6. Start Local Server (npm run dev:web)]
         │
         ▼
[7. Verify Article at http://localhost:4321/blog/<slug>/]
         │
         ▼
[8. Run Production Build (npm run build:web)]
         │
         ▼
[9. Commit & Push to GitHub (git push)]
         │
         ▼
[10. Live Deployment & Verification]
```

---

## Detailed Step-by-Step Instructions

### Step 1: Navigate to the Blog Directory
Open your terminal or file explorer and go to:
```
apps/web/src/content/blog/
```

### Step 2: Create a New Markdown File
Create a file using lowercase words separated by hyphens (kebab-case).
- **Example**: `why-web-developers-love-astro.md`

### Step 3: Paste the Frontmatter Header
At the very top of your file, paste the frontmatter configuration:

```yaml
---
title: "Why Web Developers Love Astro in 2026"
description: "A deep dive into Astro's content-first architecture, zero JavaScript baseline, and developer experience."
pubDate: 2026-09-01
author: "Girish Lade"
image: "/blog/astro-guide.svg"
imageAlt: "Astro framework logo and rocket graphic"
category: "Web Development"
tags:
  - astro
  - frontend
  - static-sites
draft: false
featured: false
---
```

### Step 4: Write Your Article Content
Write your article using standard Markdown:
- Start your first section with `## Section Title` (H2).
- Use `### Subsection Title` (H3) for nested topics.
- Add code blocks, lists, and quotes.
- End your article with a **Summary & Key Takeaways** section.

### Step 5: Add an Article Banner Image (Optional)
If your article has a graphic or banner:
1. Save the image into `apps/web/public/blog/` (e.g. `apps/web/public/blog/astro-guide.svg`).
2. Make sure the frontmatter `image:` field matches: `image: "/blog/astro-guide.svg"`.

### Step 6: Verify Draft Status
- If the article is ready for the world, ensure `draft: false`.
- If you are still working on it and don't want it published yet, set `draft: true`.

### Step 7: Launch Local Development Server
In your root workspace terminal, run:

```bash
npm run dev:web
```

Astro will start up at `http://localhost:4321`.

### Step 8: Preview Your Article
Open your browser and visit:
```
http://localhost:4321/blog/why-web-developers-love-astro/
```

Check the following items:
- [ ] Title (H1) and subtitle render cleanly.
- [ ] Breadcrumbs link back to Home and Blog.
- [ ] Table of Contents shows H2 and H3 links.
- [ ] Code blocks are highlighted properly.
- [ ] Author, date, category, and reading time are displayed.
- [ ] SaaS CTA block links to `/editor`.
- [ ] Related articles appear at the bottom.

Also check the main listing page:
```
http://localhost:4321/blog/
```
Verify that your new post card appears in the grid.

### Step 9: Test the Production Build
Before pushing to production, verify that the build compiles cleanly:

```bash
npm run build:web
```

Ensure the output ends with:
```
✓ Completed in ...
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] Complete!
```

### Step 10: Commit, Push, and Deploy
Stage your new article and push to your git repository:

```bash
git add apps/web/src/content/blog/why-web-developers-love-astro.md
git add apps/web/public/blog/astro-guide.svg
git commit -m "Publish: Why Web Developers Love Astro blog post"
git push origin main
```

Once pushed, your deployment pipeline (e.g. Cloudflare Pages) will automatically build the site and deploy your new blog post to `https://compile.ladestack.in/blog/why-web-developers-love-astro/`.
