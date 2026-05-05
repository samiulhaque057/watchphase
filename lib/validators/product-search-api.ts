import { z } from "zod";

export const productSearchApiQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(100),
  limit: z.coerce.number().int().min(1).max(48).optional().default(12),
});

export type ProductSearchApiQuery = z.infer<
  typeof productSearchApiQuerySchema
>;
