import { Prisma, ProductBadge } from "@prisma/client";
import type { CreateOrderInput } from "@/lib/validators/order";
import { prisma } from "@/lib/prisma";
import { SHIPPING_METHODS } from "@/lib/shipping-method";

type NormalizedLine = { slug: string; sku: string; quantity: number };

function mergeKey(slug: string, sku: string): string {
  return `${slug.toLowerCase()}|||${sku.trim().toLowerCase()}`;
}

function normalizeLines(data: CreateOrderInput): NormalizedLine[] | { error: string } {
  if (data.items != null && data.items.length > 0) {
    const merged = new Map<string, { slug: string; sku: string; quantity: number }>();
    for (const row of data.items) {
      const skuT = row.sku.trim();
      const key = mergeKey(row.productSlug, skuT);
      const prev = merged.get(key);
      if (prev) {
        prev.quantity += row.quantity;
      } else {
        merged.set(key, {
          slug: row.productSlug,
          sku: skuT,
          quantity: row.quantity,
        });
      }
    }
    const lines = [...merged.values()];
    for (const line of lines) {
      if (line.quantity > 20) {
        return { error: `Quantity for ${line.slug} cannot exceed 20.` };
      }
    }
    if (lines.length > 40) {
      return { error: "Too many distinct products in order." };
    }
    return lines;
  }

  if (data.productSlug) {
    const quantity = data.quantity ?? 1;
    const sku = data.sku?.trim() ?? "";
    return [{ slug: data.productSlug, sku, quantity }];
  }

  return { error: "No line items." };
}

type ProductForOrder = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  imageUrl: string;
  priceCents: number;
  badge: ProductBadge;
  variations: { sku: string; label: string }[];
};

function createRandomSevenDigitReference(): number {
  return Math.floor(1_000_000 + Math.random() * 9_000_000);
}

function isReferenceNumberUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("referenceNumber");
  }
  if (typeof target === "string") {
    return target.includes("referenceNumber");
  }
  return false;
}

function resolveLineSku(
  product: ProductForOrder,
  requestedSku: string,
):
  | { ok: true; orderSku: string; lineName: string }
  | { ok: false; error: string } {
  const trimmed = requestedSku.trim();
  if (product.variations.length === 0) {
    if (trimmed === "" || trimmed === product.sku) {
      return { ok: true, orderSku: product.sku, lineName: product.name };
    }
    return {
      ok: false,
      error: `SKU does not match listing for "${product.name}".`,
    };
  }
  if (trimmed === "") {
    return {
      ok: false,
      error: `Choose a colour or option for "${product.name}".`,
    };
  }
  const variation = product.variations.find((v) => v.sku === trimmed);
  if (!variation) {
    return {
      ok: false,
      error: `Unknown option for "${product.name}". Refresh and try again.`,
    };
  }
  return {
    ok: true,
    orderSku: variation.sku,
    lineName: `${product.name} (${variation.label})`,
  };
}

export async function createOrderFromValidatedInput(
  data: CreateOrderInput,
): Promise<
  | { ok: true; orderNumber: number; orderId: string; referenceNumber: number }
  | { ok: false; status: number; error: string }
> {
  const lines = normalizeLines(data);
  if ("error" in lines) {
    return { ok: false, status: 400, error: lines.error };
  }

  const slugs = [...new Set(lines.map((l) => l.slug))];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      imageUrl: true,
      priceCents: true,
      badge: true,
      variations: {
        select: { sku: true, label: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) {
      return {
        ok: false,
        status: 404,
        error: `Product not found: ${line.slug}`,
      };
    }
    if (product.badge === ProductBadge.SOLD_OUT) {
      return {
        ok: false,
        status: 409,
        error: `"${product.name}" is sold out.`,
      };
    }
    const resolved = resolveLineSku(product, line.sku);
    if (!resolved.ok) {
      return { ok: false, status: 400, error: resolved.error };
    }
  }

  const itemCreates: Prisma.OrderItemCreateWithoutOrderInput[] = lines.map(
    (line) => {
      const p = bySlug.get(line.slug)!;
      const resolved = resolveLineSku(p, line.sku);
      if (!resolved.ok) {
        throw new Error("unexpected resolve failure");
      }
      const lineTotal = p.priceCents * line.quantity;
      return {
        productId: p.id,
        productSlug: p.slug,
        productName: resolved.lineName,
        sku: resolved.orderSku,
        imageUrl: p.imageUrl,
        unitPriceCents: p.priceCents,
        quantity: line.quantity,
        lineTotalCents: lineTotal,
      };
    },
  );

  const subtotal = itemCreates.reduce((s, row) => s + row.lineTotalCents, 0);
  const shipping = SHIPPING_METHODS[data.shippingMethod].feeCents;
  const total = subtotal + shipping;

  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const referenceNumber = createRandomSevenDigitReference();
      try {
        const order = await prisma.order.create({
          data: {
            referenceNumber,
            customerEmail: data.email,
            customerFirstName: data.firstName,
            customerLastName: data.lastName,
            customerPhone: data.phone,
            shipLine1: data.address1,
            shipCity: data.city,
            shipPostal: data.postcode,
            shipCountry: data.shipCountry,
            instructions:
              data.instructions === "" || data.instructions == null
                ? null
                : data.instructions,
            subtotalCents: subtotal,
            shippingCents: shipping,
            totalCents: total,
            items: { create: itemCreates },
          },
          select: {
            id: true,
            orderNumber: true,
            referenceNumber: true,
          },
        });

        return {
          ok: true,
          orderNumber: order.orderNumber,
          orderId: order.id,
          referenceNumber: order.referenceNumber ?? referenceNumber,
        };
      } catch (error) {
        if (isReferenceNumberUniqueConflict(error) && attempt < 7) {
          continue;
        }
        throw error;
      }
    }
    return {
      ok: false,
      status: 500,
      error: "Could not allocate reference number. Please retry.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save order.";
    return { ok: false, status: 500, error: message };
  }
}
