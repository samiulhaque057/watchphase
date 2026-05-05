/** Products per listing / search grid page. */
export const CATALOG_PAGE_SIZE = 12;

export function parseCatalogPageParam(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return n;
}

export function clampPageToTotal(page: number, totalPages: number): number {
  const max = Math.max(1, totalPages);
  return Math.min(Math.max(1, Math.floor(page)), max);
}

/** Compact list of page numbers plus ellipses gaps (1-based). */
export function paginationItems(
  totalPages: number,
  currentPage: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) {
    return [];
  }

  const cur = clampPageToTotal(currentPage, totalPages);
  const set = new Set<number>([1, totalPages, cur, cur - 1, cur + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev > 0 && n > prev + 1) {
      out.push("ellipsis");
    }
    out.push(n);
    prev = n;
  }
  return out;
}
