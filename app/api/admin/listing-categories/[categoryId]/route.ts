import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteCtx = {
  params: Promise<{ categoryId: string }>;
};

const updateListingCategorySchema = z.object({
  label: z.string().trim().min(1).max(120),
});

export async function PATCH(request: Request, { params }: RouteCtx) {
  const { categoryId } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateListingCategorySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.listingCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const category = await prisma.listingCategory.update({
    where: { id: categoryId },
    data: { label: parsed.data.label },
    select: { id: true, slug: true, label: true },
  });

  revalidatePath("/");
  revalidatePath(`/${existing.slug}`);
  return NextResponse.json({ category });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const { categoryId } = await params;

  const existing = await prisma.listingCategory.findUnique({
    where: { id: categoryId },
    select: {
      slug: true,
      _count: { select: { products: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      {
        error:
          "This category still has products. Reassign products first, then remove the category.",
      },
      { status: 409 },
    );
  }

  await prisma.listingCategory.delete({
    where: { id: categoryId },
  });

  revalidatePath("/");
  revalidatePath(`/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
