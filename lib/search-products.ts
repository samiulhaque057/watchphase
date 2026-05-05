import {
  CATALOG_PAGE_SIZE,
  clampPageToTotal,
  parseCatalogPageParam,
} from "@/lib/catalog-pagination";
import {
  mapDbProduct,
  prismaCatalogProductInclude,
  type CatalogPagedResult,
  type CatalogProduct,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

const MIN_QUERY_LEN = 2;
const DEFAULT_LIMIT = 48;
function buildWhere(q: string) {
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { brand: { contains: q, mode: "insensitive" as const } },
      { sku: { contains: q, mode: "insensitive" as const } },
      { slug: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

/** Full `CatalogProduct` rows for storefront search + listing grid parity. */
/** Paged storefront search aligned with listing grid `/[slug]?page=N`. */
export async function searchCatalogProductsPage(
  rawQuery: string,
  pageParam?: string | string[],
): Promise<CatalogPagedResult> {
  const q = rawQuery.trim();
  const page = parseCatalogPageParam(
    Array.isArray(pageParam) ? pageParam[0] : pageParam,
  );
  const pageSize = CATALOG_PAGE_SIZE;

  const empty: CatalogPagedResult = {
    products: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
  };

  if (q.length < MIN_QUERY_LEN || !process.env.DATABASE_URL) {
    return empty;
  }

  try {
    const where = buildWhere(q);
    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = clampPageToTotal(page, totalPages);
    const rows = await prisma.product.findMany({
      where,
      orderBy: [{ brand: "asc" }, { name: "asc" }],
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
    return empty;
  }
}

export async function searchCatalogProducts(
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): Promise<CatalogProduct[]> {
  const q = rawQuery.trim();
  if (q.length < MIN_QUERY_LEN || !process.env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await prisma.product.findMany({
      where: buildWhere(q),
      take: limit,
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: prismaCatalogProductInclude,
    });
    return rows.map(mapDbProduct);
  } catch {
    return [];
  }
}

export const STORE_SEARCH_MIN_CHARS = MIN_QUERY_LEN;
