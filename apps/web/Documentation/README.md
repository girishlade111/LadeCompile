# LadeCompile Blog System — Complete Documentation Hub

Welcome to the official documentation for the **LadeCompile** Blog System. This documentation is written specifically for content creators, developers, and beginners who want to manage, write, test, and publish blog articles without needing to manually build Astro pages or write frontend code.

---

## 📚 Documentation Index

| Guide | Description | Target Audience |
| :--- | :--- | :--- |
| [**01 — Architecture Deep Dive**](./01-ARCHITECTURE.md) | How the Astro 5 Content Layer, dynamic routes, and components work under the hood. | Developers & Architects |
| [**02 — Blog Creation Guide**](./02-BLOG-CREATION-GUIDE.md) | File naming, directory rules, image assets, and complete frontmatter reference. | Writers & Editors |
| [**03 — Copy-Paste Markdown Templates**](./03-MARKDOWN-TEMPLATE.md) | Ready-to-use boilerplate templates for guides, tutorials, and comparisons. | Writers & Editors |
| [**04 — Publishing Workflow**](./04-PUBLISHING-WORKFLOW.md) | Step-by-step walkthrough: draft $\to$ preview $\to$ git commit $\to$ live deployment. | All Team Members |
| [**05 — Development & Testing Commands**](./05-DEVELOPMENT-AND-TESTING.md) | Exact terminal commands for local development, building, and validation. | All Team Members |
| [**06 — Troubleshooting Guide**](./06-TROUBLESHOOTING.md) | Solutions for YAML syntax errors, 404s, missing images, and build failures. | All Team Members |
| [**07 — My Blog Cheat Sheet**](./07-BLOG-CHEAT-SHEET.md) | Quick 60-second reference card to bookmark for everyday publishing. | Writers & Editors |

---

## ⚡ 30-Second Quick Start

To publish an article right now:

1. Create a `.md` file inside `apps/web/src/content/blog/` (e.g. `apps/web/src/content/blog/my-new-post.md`).
2. Copy the frontmatter header from [**07 — My Blog Cheat Sheet**](./07-BLOG-CHEAT-SHEET.md).
3. Write your article using standard Markdown.
4. Run `npm run dev:web` to preview it at `http://localhost:4321/blog/my-new-post/`.
5. Run `git commit -am "Publish new post" && git push` to deploy.
