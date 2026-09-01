# 07 — My Blog Cheat Sheet

*(Keep this handy every time you want to publish a new post!)*

---

### Step 1: Open Blog Directory
```
apps/web/src/content/blog/
```

### Step 2: Create a File
```
my-article-title.md
```

### Step 3: Copy This Header Block
```yaml
---
title: "Your Article Title Here"
description: "A short 1-2 sentence description for SEO and social sharing."
pubDate: 2026-09-01
author: "Girish Lade"
image: "/blog/your-image.svg"
imageAlt: "Description of the image"
category: "Web Development"
tags:
  - html
  - css
  - javascript
draft: false
featured: false
---

## First Section

Write your introduction here.

## Second Section

Write your main content here.

### Subsection

Write more details here.

## Summary & Key Takeaways

Wrap up your article here with key takeaways.
```

### Step 4: Add Image (Optional)
Drop your banner image into:
```
apps/web/public/blog/
```

### Step 5: Test Locally
```bash
npm run dev:web
```
Preview at: `http://localhost:4321/blog/my-article-title/`

### Step 6: Build & Deploy
```bash
npm run build:web
git add .
git commit -m "Publish new blog post"
git push
```

🎉 **That's it! Your article is live with automated SEO, Open Graph, Breadcrumbs, and Sitemap integration.**
