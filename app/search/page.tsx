import type { Metadata } from "next";
import Link from "next/link";
import { ProductCategoryPage } from "@/components/category/product-category-page";
import {
  searchCatalogProductsPage,
  STORE_SEARCH_MIN_CHARS,
} from "@/lib/search-products";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string | string[] }>;
};

function hrefForSearch(trimmedQuery: string, page: number): string {
  const q = new URLSearchParams();
  q.set("q", trimmedQuery);
  if (page > 1) {
    q.set("page", String(page));
  }
  return `/search?${q.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const trimmed = (q ?? "").trim();
  if (trimmed.length >= STORE_SEARCH_MIN_CHARS) {
    return {
      title: `Search · ${trimmed} | Watch Phase`,
      description: `Matches for “${trimmed}” — watches at Watch Phase.`,
      alternates: { canonical: "/search" },
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Search | Watch Phase",
    description:
      "Search watches by brand, product name, or SKU.",
    alternates: { canonical: "/search" },
    robots: { index: true, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const trimmed = (params.q ?? "").trim();

  if (trimmed.length < STORE_SEARCH_MIN_CHARS) {
    return (
      <main className="bg-white">
        <section className="border-b border-gray-200 bg-[#fafafa]">
          <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-semibold uppercase tracking-[0.08em]">
              Search
            </h1>
            <p className="mt-2 text-sm text-black/60">
              Find watches by name, brand, or SKU. Use at least{" "}
              {STORE_SEARCH_MIN_CHARS} characters.
            </p>

            <form
              action="/search"
              method="get"
              className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
              role="search"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="store-search-q"
                  className="text-xs uppercase tracking-[0.2em] text-black/55"
                >
                  Query
                </label>
                <input
                  id="store-search-q"
                  type="search"
                  name="q"
                  defaultValue={trimmed}
                  placeholder="e.g. Tissot, Visodate, SKU…"
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  autoComplete="off"
                  aria-label="Search catalogue"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 bg-black px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white"
              >
                Search
              </button>
            </form>

            <p className="mt-8 text-sm text-black/55">
              Submit the form to see results in the same grid layout as our
              collection pages.{" "}
              <Link href="/" className="underline hover:text-black">
                Back to home
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  const paged = await searchCatalogProductsPage(trimmed, params.page);

  return (
    <ProductCategoryPage
      categoryTitle={trimmed}
      categoryTag="Search results"
      products={paged.products}
      pagination={{
        totalProducts: paged.total,
        currentPage: paged.page,
        totalPages: paged.totalPages,
        hrefForPage: (page) => hrefForSearch(trimmed, page),
      }}
    />
  );
}
