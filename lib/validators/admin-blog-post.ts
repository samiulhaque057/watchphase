import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBlogPostSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(
      slugRegex,
      "URL slug: lowercase letters, numbers, and hyphens only.",
    ),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(8000),
  imageUrl: z.string().min(1).max(2048),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use published date YYYY-MM-DD."),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const patchBlogPostSchema = createBlogPostSchema.partial();
