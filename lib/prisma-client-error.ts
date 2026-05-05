import { Prisma } from "@prisma/client";

/** Readable copy for admin API when a unique index rejects the write. */
export function messageForPrismaUniqueViolation(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const raw = error.meta?.target;
    const fields: string[] = Array.isArray(raw)
      ? raw.map((x) => String(x))
      : typeof raw === "string"
        ? [raw]
        : [];

    if (fields.includes("slug")) {
      return "A product with this slug already exists — change the slug or edit that listing.";
    }
    if (fields.includes("sku")) {
      return "This SKU is already in use — use a different SKU or edit the listing that uses it.";
    }
    return "That value conflicts with an existing product (unique field). Check slug and SKUs.";
  }
  return fallback;
}
