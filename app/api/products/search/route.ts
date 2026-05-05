import { NextResponse } from "next/server";
import type { CatalogProduct } from "@/lib/catalog";
import { searchCatalogProducts } from "@/lib/search-products";
import { productSearchApiQuerySchema } from "@/lib/validators/product-search-api";

/** Public product search JSON for instant results (PostgreSQL ILIKE). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = {
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = productSearchApiQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query.",
        details: parsed.error.flatten(),
        products: [] as CatalogProduct[],
      },
      { status: 400 },
    );
  }

  const products = await searchCatalogProducts(parsed.data.q, parsed.data.limit);
  return NextResponse.json({ products });
}
