import { z } from "zod";
import {
  type CartLine,
  CART_LINE_MAX_QTY,
  CART_MAX_DISTINCT_LINES,
  CART_STORAGE_KEY,
} from "@/lib/cart-types";

const lineSchema = z.object({
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(CART_LINE_MAX_QTY),
  name: z.string().min(1).max(500),
  brand: z.string().min(1).max(160),
  sku: z.string().min(1).max(128),
  variationLabel: z.string().max(160).nullable().optional(),
  image: z.string().min(1).max(2000),
  priceLabel: z.string().min(1).max(80),
  priceCents: z.number().int().min(0).max(1_000_000_000),
});

const payloadSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  lines: z.array(lineSchema).max(CART_MAX_DISTINCT_LINES),
});

export function parseCartPayload(raw: string | null): CartLine[] | null {
  if (raw == null || raw === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const data = payloadSchema.safeParse(parsed);
    if (!data.success) {
      return null;
    }
    return data.data.lines.map((line) => ({
      ...line,
      variationLabel: line.variationLabel ?? null,
    }));
  } catch {
    return null;
  }
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify({
    version: 2 as const,
    lines: lines.slice(0, CART_MAX_DISTINCT_LINES),
  });
}

export function safeReadStoredCart(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    return parseCartPayload(localStorage.getItem(CART_STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function safeWriteStoredCart(lines: CartLine[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
  } catch {
    /** Storage full or unavailable. */
  }
}
