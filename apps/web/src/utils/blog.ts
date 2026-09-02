import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

/**
 * Extracts the clean URL slug from a blog post entry.
 * Supports both Astro 5 Content Layer (id) and legacy Content Collections (slug).
 */
const LOCALE_PREFIX_RE = /^(en|zh|pt-br|ru|ja|tr|ko)\//i;

export function getPostLocale(post: BlogPost): string {
  const raw = (post as unknown as { data?: { locale?: string } })?.data?.locale ?? "";
  if (raw) return String(raw).toLowerCase();
  const id = post.id ?? (post as unknown as { slug?: string }).slug ?? "";
  const seg = id.split("/")[0]?.toLowerCase();
  if (["en", "zh", "pt-br", "ru", "ja", "tr", "ko"].includes(seg)) return seg;
  return "en";
}

export function getPostSlug(post: BlogPost): string {
  const raw = post.id ?? (post as unknown as { slug?: string }).slug ?? "";
  const withoutExt = raw.replace(/\.(md|mdx)$/, "");
  // Strip locale folder prefix if present (en/, zh/, pt-br/, etc.)
  return withoutExt.replace(LOCALE_PREFIX_RE, "");
}

/**
 * Formats a Date object into a readable string (e.g., "Aug 28, 2026").
 */
export function formatBlogDate(date: Date | string | number | undefined): string {
  if (!date) return "Recent";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return "Recent";
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculates estimated reading time from raw Markdown text.
 * Assumes an average reading speed of 200 words per minute.
 */
export function calculateReadingTime(body?: string): string {
  if (!body) return "3 min read";
  // Strip code blocks and markdown syntax for word count accuracy
  const cleanText = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`.*?`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>]/g, "")
    .trim();
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Filters out draft posts in production and sorts posts newest first.
 */
export function filterPublishedPosts(posts: BlogPost[], includeDrafts = false): BlogPost[] {
  return posts
    .filter((post) => includeDrafts || !post.data.draft)
    .sort((a, b) => {
      const dateA = a.data.pubDate?.valueOf() ?? 0;
      const dateB = b.data.pubDate?.valueOf() ?? 0;
      return dateB - dateA;
    });
}

/**
 * Deterministically finds related posts based on matching category (+3 pts) and tags (+1 pt each).
 * Excludes the current post and drafts.
 */
export function getRelatedPosts(currentPost: BlogPost, allPosts: BlogPost[], limit = 3): BlogPost[] {
  const currentSlug = getPostSlug(currentPost);
  const currentCategory = currentPost.data.category?.toLowerCase();
  const currentTags = new Set((currentPost.data.tags || []).map((t) => t.toLowerCase()));

  const publishedPosts = allPosts.filter(
    (p) => !p.data.draft && getPostSlug(p) !== currentSlug
  );

  const scored = publishedPosts.map((post) => {
    let score = 0;
    if (post.data.category && post.data.category.toLowerCase() === currentCategory) {
      score += 3;
    }
    if (post.data.tags) {
      for (const tag of post.data.tags) {
        if (currentTags.has(tag.toLowerCase())) {
          score += 1;
        }
      }
    }
    return { post, score };
  });

  // Sort by score descending; if tied, sort by newest publication date
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateA = a.post.data.pubDate?.valueOf() ?? 0;
    const dateB = b.post.data.pubDate?.valueOf() ?? 0;
    return dateB - dateA;
  });

  return scored.slice(0, limit).map((s) => s.post);
}

/**
 * Gets the adjacent (previous and next) published posts for chronological navigation.
 */
export function getAdjacentPosts(
  currentPost: BlogPost,
  sortedPublishedPosts: BlogPost[]
): { prevPost?: BlogPost; nextPost?: BlogPost } {
  const currentSlug = getPostSlug(currentPost);
  const index = sortedPublishedPosts.findIndex((p) => getPostSlug(p) === currentSlug);

  if (index === -1) {
    return {};
  }

  // sortedPublishedPosts is newest first (index 0 is newest)
  // prevPost (newer): index - 1
  // nextPost (older): index + 1
  const prevPost = index > 0 ? sortedPublishedPosts[index - 1] : undefined;
  const nextPost = index < sortedPublishedPosts.length - 1 ? sortedPublishedPosts[index + 1] : undefined;

  return { prevPost, nextPost };
}
