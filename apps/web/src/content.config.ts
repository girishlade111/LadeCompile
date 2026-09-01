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
      // Normalize pubDate / publishDate so both work interchangeably
      pubDate: data.pubDate ?? data.publishDate ?? new Date(),
      // Normalize image / heroImage
      image: data.image ?? data.heroImage ?? "/favicon.svg",
    })),
});

export const collections = { blog };
