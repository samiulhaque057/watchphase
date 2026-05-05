import { prisma } from "@/lib/prisma";

export async function findListingCategoryBySlug(slug: string) {
  return prisma.listingCategory.findUnique({
    where: { slug },
    select: { id: true, slug: true, label: true, listingTag: true },
  });
}
