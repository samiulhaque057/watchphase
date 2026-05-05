import { z } from "zod";
import {
  DEFAULT_SHIPPING_METHOD,
  SHIPPING_METHODS,
} from "@/lib/shipping-method";

const productSlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const orderCartLineSchema = z.object({
  productSlug: productSlugSchema,
  sku: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(20),
});

const customerShape = {
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(40),
  address1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(120),
  postcode: z.string().trim().min(2).max(32),
  shipCountry: z.string().trim().min(2).max(80).optional().default("Bangladesh"),
  instructions: z.union([z.string().max(1000), z.literal("")]).optional(),
} as const;

export const createOrderSchema = z
  .object({
    ...customerShape,
    productSlug: productSlugSchema.optional(),
    quantity: z.coerce.number().int().min(1).max(20).optional(),
    items: z.array(orderCartLineSchema).min(1).max(40).optional(),
    sku: z.preprocess(
      (v) =>
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "")
          ? undefined
          : String(v).trim(),
      z.string().min(1).max(80).optional(),
    ),
    shippingMethod: z
      .enum(Object.keys(SHIPPING_METHODS) as [keyof typeof SHIPPING_METHODS, ...Array<keyof typeof SHIPPING_METHODS>])
      .optional()
      .default(DEFAULT_SHIPPING_METHOD),
  })
  .superRefine((data, ctx) => {
    const hasSingle = data.productSlug != null;
    const hasCart = data.items != null && data.items.length > 0;
    if (hasSingle === hasCart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasSingle ? ["items"] : ["productSlug"],
        message:
          "Send productSlug (and optional quantity) for buy now, or items[] for cart checkout — not both.",
      });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderStatusPatchSchema = z.object({
  status: z.enum([
    "NEW",
    "PROCESSING",
    "SHIPPED",
    "COMPLETED",
    "CANCELLED",
  ]),
});
