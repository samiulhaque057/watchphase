import { z } from "zod";

/** Slugs that collide with Next.js routes or internal paths — never allow as listing URL. */
export const RESERVED_LISTING_SLUG_SET = new Set([
  "",
  "_next",
  "api",
  "internal",
  "product",
  "search",
  "buy-now",
  "cart",
  "uploads",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

const listingSlugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase slug with hyphens only",
  )
  .refine((s) => !RESERVED_LISTING_SLUG_SET.has(s), "Slug is reserved");

export const createListingCategorySchema = z.object({
  slug: listingSlugSchema,
  label: z.string().min(1).max(120),
  listingTag: z.string().min(1).max(120).optional().default("Category"),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

export type CreateListingCategoryInput = z.infer<
  typeof createListingCategorySchema
>;
