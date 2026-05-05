import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createListingCategorySchema } from "@/lib/validators/admin-listing-category";

export async function GET() {
  const categories = await prisma.listingCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      slug: true,
      label: true,
      listingTag: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createListingCategorySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const category = await prisma.listingCategory.create({
      data: {
        slug: data.slug,
        label: data.label,
        listingTag: data.listingTag,
        sortOrder: data.sortOrder,
      },
      select: {
        id: true,
        slug: true,
        label: true,
        listingTag: true,
        sortOrder: true,
      },
    });
    revalidatePath("/");
    revalidatePath(`/${category.slug}`);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Create category failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
