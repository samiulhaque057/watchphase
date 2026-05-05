import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { resolvePurchasableSkuForProduct } from "@/lib/catalog";
import type { CatalogPaginationProps } from "@/components/category/catalog-pagination";
import { CatalogPagination } from "@/components/category/catalog-pagination";
import { AddToCartMiniButton } from "@/components/product/add-to-cart-button";

type CategoryProductPageProps = {
  categoryTitle: string;
  categoryTag: string;
  products: CatalogProduct[];
  /** When set (e.g. from server-paged loaders), drives product count label and pager. */
  pagination?: CatalogPaginationProps & { totalProducts: number };
};

export function ProductCategoryPage({
  categoryTitle,
  categoryTag,
  products,
  pagination,
}: CategoryProductPageProps) {
  const totalLabel = pagination?.totalProducts ?? products.length;

  return (
    <main className="bg-white">
      <section className="border-b border-gray-200 bg-[#fafafa]">
        <div className="container mx-auto px-4 py-5 md:py-7">
          <p className="text-xs uppercase tracking-[0.25em] text-black/70">
            {categoryTag}
          </p>
          <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.05em] sm:text-3xl md:text-4xl md:tracking-[0.08em]">
            {categoryTitle}
          </h1>
        </div>
      </section>

      <section className="container mx-auto px-4 py-5 md:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2.5">
          <p className="text-sm uppercase tracking-[0.12em] text-black/70">
            {totalLabel} product{totalLabel === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <label
              htmlFor="sort-by"
              className="text-xs uppercase tracking-[0.1em] text-black/70 sm:text-sm sm:tracking-[0.12em]"
            >
              Sort by
            </label>
            <select
              id="sort-by"
              className="border border-gray-300 bg-white px-2.5 py-2 text-xs outline-none sm:px-3 sm:text-sm"
              aria-label="Sort products"
            >
              <option>Date, new to old</option>
              <option>Price, low to high</option>
              <option>Price, high to low</option>
            </select>
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const isSoldOut = product.badge === "Sold Out";
            return (
              <article key={product.slug} className="group flex flex-col">
                <div className="relative aspect-[1/1.1] overflow-hidden">
                  <Link
                    href={`/product/${product.slug}`}
                    aria-label={product.name}
                    className="relative block h-full w-full"
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className={`object-cover transition duration-300 group-hover:scale-105 ${
                        isSoldOut ? "opacity-60" : ""
                      }`}
                    />
                  </Link>
                  {product.badge ? (
                    <span
                      className={`absolute bottom-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white ${
                        isSoldOut ? "bg-black" : "bg-blue-600"
                      }`}
                    >
                      {product.badge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex-1">
                  <Link href={`/product/${product.slug}`}>
                    <h2 className="line-clamp-2 text-center text-[15px] font-medium uppercase tracking-[0.12em] leading-[1.35] hover:underline">
                      {product.name}
                    </h2>
                  </Link>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 text-base">
                    {product.oldPrice ? (
                      <span className="text-black/50 line-through">
                        {product.oldPrice}
                      </span>
                    ) : null}
                    <span className="font-semibold">{product.price}</span>
                  </div>
                </div>
                <div className="mt-3.5 grid w-full grid-cols-2 gap-2">
                  <AddToCartMiniButton product={product} />
                  {isSoldOut ? (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed border border-gray-300 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-black/35"
                    >
                      Buy Now
                    </button>
                  ) : (
                    <Link
                      href={
                        product.variations.length > 0
                          ? `/buy-now?slug=${encodeURIComponent(product.slug)}&sku=${encodeURIComponent(
                              resolvePurchasableSkuForProduct(product, null),
                            )}`
                          : `/buy-now?slug=${encodeURIComponent(product.slug)}`
                      }
                      className="w-full border border-emerald-800 bg-emerald-800 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:border-emerald-900 hover:bg-emerald-900"
                    >
                      Buy Now
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {pagination ? (
          <CatalogPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hrefForPage={pagination.hrefForPage}
          />
        ) : null}
      </section>
    </main>
  );
}
