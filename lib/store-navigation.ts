import { prisma } from "@/lib/prisma";

export type StoreNavCategory = {
  slug: string;
  label: string;
  href: string;
};

export const STOREFRONT_ROOT_SLUGS = [
  "mens-watch",
  "womens-watch",
  "european-grade",
  "swiss-grade",
] as const;

/** Used when Postgres is unreachable or listing rows are absent. */
export const DEFAULT_NAV_CATEGORIES: StoreNavCategory[] = [];

export function storefrontCategoryHref(slug: string): string {
  return slug.startsWith("/") ? slug : `/${slug}`;
}

export async function loadStoreNavigationCategories(): Promise<
  StoreNavCategory[]
> {
  if (!process.env.DATABASE_URL) {
    return DEFAULT_NAV_CATEGORIES;
  }
  try {
    const rows = await prisma.listingCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { slug: true, label: true },
    });
    if (rows.length === 0) {
      return DEFAULT_NAV_CATEGORIES;
    }
    return rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      href: storefrontCategoryHref(row.slug),
    }));
  } catch {
    return DEFAULT_NAV_CATEGORIES;
  }
}
