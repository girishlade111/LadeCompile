# 06 — Troubleshooting & Common Issues Guide

This guide covers common mistakes and how to quickly resolve them.

---

## Issue 1: "My new article does not appear on `/blog/`"

### Possible Causes & Solutions:
1. **Check `draft:` status**:
   - If `draft: true` is set, the article is hidden from production listings.
   - **Fix**: Change to `draft: false`.
2. **Check File Location**:
   - Ensure the file is inside `apps/web/src/content/blog/` (not `apps/web/src/pages/` or root `src/`).
3. **Restart the dev server**:
   - Stop the server (`Ctrl + C`) and restart with `npm run dev:web`.

---

## Issue 2: "Frontmatter Validation Error during build"

### Symptom:
When running `npm run build:web`, you see an error like:
```
[content] Failed to parse frontmatter for src/content/blog/my-post.md
title: Required
```

### Possible Causes & Solutions:
1. **Missing Required Fields**:
   - `title` and `description` are mandatory fields. Ensure both exist in your frontmatter.
2. **Unquoted Colons in Title or Description**:
   - In YAML, a colon (`:`) followed by a space indicates a key-value pair. If your title contains a colon, YAML will fail to parse it.
   - ❌ **Wrong**: `title: CSS Grid: The Complete Guide`
   - ✅ **Correct**: `title: "CSS Grid: The Complete Guide"` (wrap in double quotes).
3. **Invalid Date Format**:
   - Dates should follow the `YYYY-MM-DD` standard format.
   - ❌ **Wrong**: `pubDate: 01/09/2026` or `pubDate: Sep 1, 2026`
   - ✅ **Correct**: `pubDate: 2026-09-01`

---

## Issue 3: "Visiting the article URL returns 404 Not Found"

### Possible Causes & Solutions:
1. **Check the exact URL slug**:
   - The URL matches the filename exactly without `.md`.
   - File: `src/content/blog/html5-canvas-guide.md`
   - URL: `http://localhost:4321/blog/html5-canvas-guide/`
2. **Draft Post**:
   - If `draft: true` is enabled, the route will return 404 in production builds. Set `draft: false` to test the published route.
3. **Trailing Slashes**:
   - Astro canonical URLs use trailing slashes: `/blog/my-post/`.

---

## Issue 4: "Banner image is broken or not loading"

### Possible Causes & Solutions:
1. **Incorrect Image Path**:
   - Images placed in `apps/web/public/blog/my-banner.svg` are served at `/blog/my-banner.svg`.
   - ❌ **Wrong**: `image: "public/blog/my-banner.svg"`
   - ❌ **Wrong**: `image: "../public/blog/my-banner.svg"`
   - ❌ **Wrong**: `image: "my-banner.svg"`
   - ✅ **Correct**: `image: "/blog/my-banner.svg"`
2. **Image Missing from Public Directory**:
   - Verify the file actually exists inside `apps/web/public/blog/`.

---

## Issue 5: "Two H1 headings appear on the page"

### Cause:
You placed a `# H1 Title` at the beginning of your Markdown content body.

### Solution:
Astro automatically renders your frontmatter `title` as the article's `<h1>`. Start your Markdown content with `## Section Title` (`<h2>`).

- ❌ **Wrong**:
  ```markdown
  ---
  title: "My Article Title"
  ---
  # My Article Title
  Content starts here...
  ```

- ✅ **Correct**:
  ```markdown
  ---
  title: "My Article Title"
  ---
  ## Introduction
  Content starts here...
  ```

---

## Issue 6: "Table of Contents is missing or empty"

### Cause:
The Table of Contents automatically renders when an article has **at least 2** headings of depth `## H2` or `### H3`.

### Solution:
Ensure your article sections use standard Markdown headings:
```markdown
## Overview
Some text...

## Deep Dive
Some text...
```

---

## Issue 7: "Code blocks are not highlighted"

### Cause:
Fenced code blocks are missing the language specifier.

### Solution:
Add the language identifier immediately after the triple backticks:

````markdown
```html
<div>Hello World</div>
```

```css
body { color: red; }
```

```javascript
console.log('Test');
```
````
