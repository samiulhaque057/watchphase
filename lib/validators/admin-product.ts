import { z } from "zod";

import {
  MAX_PRODUCT_GALLERY_IMAGES,
  normalizeGalleryUrls,
} from "@/lib/product-gallery-images";

const badgeSchema = z.enum(["NONE", "SALE", "SOLD_OUT"]);

const imageUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("https://") ||
      value.startsWith("http://") ||
      value.startsWith("/uploads/"),
    "Image must be https, http, or /uploads/ path",
  );

/** Raw JSON from admin includes `galleryImages` (preferred). Legacy payloads send only `imageUrl`. */
export const createProductPayloadPreprocess = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object" || raw === null) {
    return raw;
  }
  const o = raw as Record<string, unknown>;
  let next = o;
  const g = o.galleryImages;
  const hasGallery =
    Array.isArray(g) &&
    g.length > 0 &&
    typeof g[0] === "string" &&
    String(g[0]).trim() !== "";
  if (!hasGallery && typeof o.imageUrl === "string" && o.imageUrl.trim() !== "") {
    next = { ...next, galleryImages: [o.imageUrl.trim()] };
  }
  if (!Array.isArray(o.listingCategoryIds) && typeof o.listingCategoryId === "string") {
    next = { ...next, listingCategoryIds: [o.listingCategoryId] };
  }
  return next;
};

export const productVariationPayloadSchema = z.object({
  sku: z.string().max(80).transform((s) => s.trim()).pipe(z.string().min(1)),
  label: z.string().min(1).max(120).transform((s) => s.trim()),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
});

const productBodySchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase slug with hyphens only"),
    name: z.string().min(3).max(200),
    brand: z.string().min(2).max(80),
    sku: z.string().max(80).transform((s) => s.trim()).pipe(z.string().min(1)),
    description: z.string().min(10).max(8000),
    galleryImages: z
      .array(imageUrlSchema)
      .min(1)
      .max(MAX_PRODUCT_GALLERY_IMAGES),
    priceCents: z.preprocess(
      (value) => (value === null || value === undefined ? undefined : value),
      z.coerce.number().int().positive().max(1_000_000_000),
    ),
    compareAtPriceCents: z.preprocess(
      (value) =>
        value === null || value === undefined || value === ""
          ? undefined
          : value,
      z.coerce.number().int().positive().optional(),
    ),
    listingCategoryIds: z.array(z.string().cuid()).min(1).max(12),
    badge: badgeSchema.optional().default("NONE"),
    variations: z
      .array(productVariationPayloadSchema)
      .max(40)
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < data.variations.length; i += 1) {
      const v = data.variations[i];
      const key = v.sku.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variations", i, "sku"],
          message: "Duplicate variation SKU.",
        });
      }
      seen.add(key);
      if (v.sku.toLowerCase() === data.sku.toLowerCase()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variations", i, "sku"],
          message: "Variation SKU must differ from the main listing SKU.",
        });
      }
    }
  })
  .transform((data) => {
    const gallery = normalizeGalleryUrls(data.galleryImages);
    const primary =
      gallery.length > 0 ? gallery[0]! : data.galleryImages[0]!;
    const dedupCategoryIds = [...new Set(data.listingCategoryIds)];
    return {
      ...data,
      galleryImages: gallery.length > 0 ? gallery : data.galleryImages,
      imageUrl: primary,
      listingCategoryIds: dedupCategoryIds,
      listingCategoryId: dedupCategoryIds[0]!,
    };
  });

export const createProductSchema = z.preprocess(
  createProductPayloadPreprocess,
  productBodySchema,
);

export type CreateProductInput = z.infer<typeof createProductSchema>;
