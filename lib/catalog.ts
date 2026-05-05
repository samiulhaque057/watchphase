import type { ListingCategory, Product, ProductBadge } from "@prisma/client";
import { ProductBadge as ProductBadgeEnum } from "@prisma/client";
import {
  CATALOG_PAGE_SIZE,
  clampPageToTotal,
  parseCatalogPageParam,
} from "@/lib/catalog-pagination";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_ROOT_SLUGS } from "@/lib/store-navigation";
import { formatTakaFromCents } from "@/lib/format-taka";

export type ListingCategoryPublic = {
  id: string;
  slug: string;
  label: string;
};

export type CatalogVariation = {
  sku: string;
  label: string;
  sortOrder: number;
};

export type CatalogProduct = {
  slug: string;
  name: string;
  oldPrice: string | null;
  price: string;
  /** Authoritative unit for cart / checkout math (minor units). */
  priceCents: number;
  badge: "Sale" | "Sold Out" | null;
  image: string;
  /** Ordered gallery URLs; index 0 always matches {@link CatalogProduct.image}. */
  images: string[];
  brand: string;
  sku: string;
  description: string;
  listingCategory: ListingCategoryPublic;
  listingCategories: ListingCategoryPublic[];
  variations: CatalogVariation[];
};

export const prismaCatalogProductInclude = {
  listingCategory: { select: { id: true, slug: true, label: true } },
  listingCategoryLinks: {
    select: {
      listingCategory: { select: { id: true, slug: true, label: true } },
    },
  },
  variations: {
    select: { sku: true, label: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
  galleryImages: {
    select: { url: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

export function resolvePurchasableSkuForProduct(
  product: CatalogProduct,
  skuFromQuery?: string | null,
): string {
  const q = skuFromQuery?.trim();
  if (product.variations.length === 0) {
    return product.sku;
  }
  if (q && product.variations.some((v) => v.sku === q)) {
    return q;
  }
  const first = product.variations[0];
  return first ? first.sku : product.sku;
}

export function variationLabelForSku(
  product: CatalogProduct,
  sku: string,
): string | null {
  const row = product.variations.find((v) => v.sku === sku);
  return row ? row.label : null;
}

const LISTING_SLUG_CYCLE = [...STOREFRONT_ROOT_SLUGS] as unknown as string[];

/** Default labels aligned with DEFAULT_NAV_CATEGORIES. */
const DEFAULT_LABEL_FOR_SLUG: Record<
  (typeof STOREFRONT_ROOT_SLUGS)[number],
  string
> = {
  "mens-watch": "Mens Watch",
  "womens-watch": "Womens Watch",
  "european-grade": "European Grade",
  "swiss-grade": "Swiss Grade",
};

const FALLBACK_LISTING_BY_SLUG = new Map<
  string,
  Pick<ListingCategoryPublic, "slug" | "label"> & { id: string }
>(
  STOREFRONT_ROOT_SLUGS.map((slug, i) => [
    slug,
    {
      id: `fallback_lc_${i}`,
      slug,
      label: DEFAULT_LABEL_FOR_SLUG[slug],
    },
  ]),
);

function fallbackListingForIndex(
  index: number,
): ListingCategoryPublic & { id: string } {
  const slug =
    LISTING_SLUG_CYCLE[index % LISTING_SLUG_CYCLE.length] ?? "mens-watch";
  const meta = FALLBACK_LISTING_BY_SLUG.get(slug);
  if (meta) {
    return meta;
  }
  return { id: `fallback_lc_${index}`, slug, label: slug };
}
export const fallbackProducts: CatalogProduct[] = [];

function badgeToUi(badge: ProductBadge): "Sale" | "Sold Out" | null {
  if (badge === ProductBadgeEnum.SALE) return "Sale";
  if (badge === ProductBadgeEnum.SOLD_OUT) return "Sold Out";
  return null;
}

type DbProductWithCategory = Product & {
  listingCategory: Pick<ListingCategory, "id" | "slug" | "label">;
  listingCategoryLinks?: Array<{
    listingCategory: Pick<ListingCategory, "id" | "slug" | "label">;
  }>;
  variations: CatalogVariation[];
  galleryImages?: ReadonlyArray<{ url: string; sortOrder: number }>;
};

function orderedGalleryUrls(row: DbProductWithCategory): string[] {
  const g = row.galleryImages;
  if (Array.isArray(g) && g.length > 0) {
    return [...g]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => entry.url);
  }
  return row.imageUrl ? [row.imageUrl] : [];
}

export function mapDbProduct(row: DbProductWithCategory): CatalogProduct {
  const images = orderedGalleryUrls(row);
  const primary = images[0] ?? row.imageUrl;

  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    description: row.description,
    image: primary,
    images,
    priceCents: row.priceCents,
    variations: row.variations.map((v) => ({
      sku: v.sku,
      label: v.label,
      sortOrder: v.sortOrder,
    })),
    listingCategory: {
      id: row.listingCategory.id,
      slug: row.listingCategory.slug,
      label: row.listingCategory.label,
    },
    listingCategories:
      row.listingCategoryLinks?.map((entry) => ({
        id: entry.listingCategory.id,
        slug: entry.listingCategory.slug,
        label: entry.listingCategory.label,
      })) ?? [
        {
          id: row.listingCategory.id,
          slug: row.listingCategory.slug,
          label: row.listingCategory.label,
        },
      ],
    price: formatTakaFromCents(row.priceCents),
    oldPrice:
      row.compareAtPriceCents != null
        ? formatTakaFromCents(row.compareAtPriceCents)
        : null,
    badge: badgeToUi(row.badge),
  };
}

function filterProductsByListingCategorySlug(
  products: CatalogProduct[],
  categorySlug?: string,
): CatalogProduct[] {
  if (!categorySlug) {
    return products;
  }
  return products.filter(
    (item) =>
      item.listingCategory.slug === categorySlug ||
      item.listingCategories.some((cat) => cat.slug === categorySlug),
  );
}

export type CatalogPagedResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function sliceFallbackCategoryPage(
  listingCategorySlug: string,
  page: number,
  pageSize: number,
): CatalogPagedResult {
  const all = filterProductsByListingCategorySlug(
    fallbackProducts,
    listingCategorySlug,
  );
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageClamped = clampPageToTotal(page, totalPages);
  const start = (pageClamped - 1) * pageSize;
  return {
    products: all.slice(start, start + pageSize),
    total,
    page: pageClamped,
    pageSize,
    totalPages,
  };
}

export async function getCatalogProductsPage(
  listingCategorySlug: string,
  pageParam?: string | string[],
): Promise<CatalogPagedResult> {
  const page = parseCatalogPageParam(
    Array.isArray(pageParam) ? pageParam[0] : pageParam,
  );
  const pageSize = CATALOG_PAGE_SIZE;

  if (!process.env.DATABASE_URL) {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const where = {
    OR: [
      { listingCategory: { slug: listingCategorySlug } },
      { listingCategoryLinks: { some: { listingCategory: { slug: listingCategorySlug } } } },
    ],
  };

  try {
    const total = await prisma.product.count({ where });
    if (total === 0) {
      return {
        products: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
      };
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = clampPageToTotal(page, totalPages);

    const rows = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (pageClamped - 1) * pageSize,
      take: pageSize,
      include: prismaCatalogProductInclude,
    });

    return {
      products: rows.map(mapDbProduct),
      total,
      page: pageClamped,
      pageSize,
      totalPages,
    };
  } catch {
    return {
      products: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }
}

export async function getCatalogProducts(
  listingCategorySlug?: string,
): Promise<CatalogProduct[]> {
  const pick = (products: CatalogProduct[]) =>
    filterProductsByListingCategorySlug(products, listingCategorySlug);

  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await prisma.product.findMany({
      where: listingCategorySlug
        ? {
            OR: [
              { listingCategory: { slug: listingCategorySlug } },
              { listingCategoryLinks: { some: { listingCategory: { slug: listingCategorySlug } } } },
            ],
          }
        : undefined,
      include: prismaCatalogProductInclude,
      orderBy: { updatedAt: "desc" },
    });
    if (rows.length === 0) {
      return [];
    }
    return rows.map(mapDbProduct);
  } catch {
    return [];
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | undefined> {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  try {
    const row = await prisma.product.findUnique({
      where: { slug },
      include: prismaCatalogProductInclude,
    });
    if (row) {
      return mapDbProduct(row);
    }
  } catch {
    /**/
  }

  return undefined;
}

export async function getAllProductSlugs(): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await prisma.product.findMany({
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export const staticCatalogProducts = fallbackProducts;
