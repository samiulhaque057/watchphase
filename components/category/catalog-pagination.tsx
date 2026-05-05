import Link from "next/link";
import { paginationItems } from "@/lib/catalog-pagination";

export type CatalogPaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

export function CatalogPagination({
  currentPage,
  totalPages,
  hrefForPage,
}: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = paginationItems(totalPages, currentPage);

  const linkBase =
    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm px-2 text-black/60 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2";
  const navLabelBase =
    "inline-flex min-h-9 items-center px-2 text-xs font-medium uppercase tracking-[0.14em]";
  const disabledNav = `${navLabelBase} cursor-default text-black/30`;

  return (
    <div className="mt-14 w-full text-center">
      <nav
        aria-label="Pagination"
        className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm font-medium"
      >
        {currentPage > 1 ? (
          <Link
            href={hrefForPage(currentPage - 1)}
            className={`${navLabelBase} text-black hover:underline`}
            rel="prev"
          >
            Previous
          </Link>
        ) : (
          <span className={disabledNav} aria-disabled="true">
            Previous
          </span>
        )}

        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex min-h-9 items-center px-1 text-black/40"
              aria-hidden
            >
              …
            </span>
          ) : item === currentPage ? (
            <span
              key={`page-${item}`}
              aria-current="page"
              className="inline-flex min-h-9 min-w-9 items-center justify-center border-b-2 border-black px-2 pb-1 font-semibold"
            >
              {item}
            </span>
          ) : (
            <Link key={`page-${item}`} href={hrefForPage(item)} className={linkBase}>
              {item}
            </Link>
          ),
        )}

        {currentPage < totalPages ? (
          <Link
            href={hrefForPage(currentPage + 1)}
            className={`${navLabelBase} text-black hover:underline`}
            rel="next"
          >
            Next
          </Link>
        ) : (
          <span className={disabledNav} aria-disabled="true">
            Next
          </span>
        )}
      </nav>
    </div>
  );
}
