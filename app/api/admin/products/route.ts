import { ProductBadge } from "@prisma/client";
import { NextResponse } from "next/server";
import { createProductSchema } from "@/lib/validators/admin-product";
import { messageForPrismaUniqueViolation } from "@/lib/prisma-client-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      sku: true,
      description: true,
      priceCents: true,
      compareAtPriceCents: true,
      listingCategoryId: true,
      listingCategory: {
        select: { slug: true, label: true },
      },
      listingCategoryLinks: {
        select: {
          listingCategory: {
            select: { id: true, slug: true, label: true },
          },
        },
      },
      badge: true,
      imageUrl: true,
      updatedAt: true,
      variations: {
        select: {
          id: true,
          sku: true,
          label: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      galleryImages: {
        select: { id: true, url: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const badgeMap: Record<string, ProductBadge> = {
    NONE: ProductBadge.NONE,
    SALE: ProductBadge.SALE,
    SOLD_OUT: ProductBadge.SOLD_OUT,
  };

  const listingCategories = await prisma.listingCategory.findMany({
    where: { id: { in: data.listingCategoryIds } },
    select: { id: true },
  });

  if (listingCategories.length !== data.listingCategoryIds.length) {
    return NextResponse.json(
      { error: "One or more listing categories were not found." },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        brand: data.brand,
        sku: data.sku,
        description: data.description,
        imageUrl: data.imageUrl,
        listingCategoryId: data.listingCategoryId,
        listingCategoryLinks: {
          createMany: {
            data: data.listingCategoryIds.map((listingCategoryId) => ({
              listingCategoryId,
            })),
            skipDuplicates: true,
          },
        },
        priceCents: data.priceCents,
        compareAtPriceCents:
          typeof data.compareAtPriceCents === "number"
            ? data.compareAtPriceCents
            : null,
        badge: badgeMap[data.badge] ?? ProductBadge.NONE,
        galleryImages: {
          create: data.galleryImages.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
        variations:
          data.variations.length > 0
            ? {
                create: data.variations.map((v, index) => ({
                  sku: v.sku,
                  label: v.label,
                  sortOrder:
                    typeof v.sortOrder === "number" ? v.sortOrder : index,
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Could not create listing.";
    const message = messageForPrismaUniqueViolation(error, raw);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
