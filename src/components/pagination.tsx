import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Total number of results across all pages. */
  total: number;
  perPage: number;
  basePath: string;
  extraParams?: string;
}

/**
 * Page numbers with ellipses: 1 2 3 … 10 11
 *
 * Always shows the first and last two pages plus a window around the current
 * one, so the size of the list is visible at any page count. At either end the
 * window is nudged inward so the run of numbers keeps the same width. Returns
 * page numbers and "gap" markers.
 */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const shown = new Set<number>([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1]);
  if (page <= 2) shown.add(3);
  if (page >= totalPages - 1) shown.add(totalPages - 2);

  const pages = [...shown].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    // A gap of exactly one page is shown as that page; "…" would hide nothing.
    if (prev !== undefined && p - prev === 2) items.push(p - 1);
    else if (prev !== undefined && p - prev > 2) items.push("gap");
    items.push(p);
  });
  return items;
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  basePath,
  extraParams = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const separator = basePath.includes("?") ? "&" : "?";
  const buildHref = (p: number) =>
    `${basePath}${separator}page=${p}${extraParams ? `&${extraParams}` : ""}`;

  const items = pageWindow(page, totalPages);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const edgeButton = (label: string, target: number, disabled: boolean) =>
    disabled ? (
      <Button variant="outline" size="sm" disabled>
        {label}
      </Button>
    ) : (
      <Link href={buildHref(target)} aria-label={`${label} page`}>
        <Button variant="outline" size="sm">
          {label}
        </Button>
      </Link>
    );

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground tabular-nums">
        Showing {from}–{to} of {total} results · Page {page} of {totalPages}
      </p>

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
        {edgeButton("First", 1, page === 1)}

        {items.map((item, i) =>
          item === "gap" ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="px-0.5 text-sm text-muted-foreground select-none"
            >
              …
            </span>
          ) : item === page ? (
            <Button
              key={item}
              size="sm"
              aria-current="page"
              aria-label={`Page ${item}`}
              className="min-w-9 tabular-nums"
            >
              {item}
            </Button>
          ) : (
            <Link key={item} href={buildHref(item)} aria-label={`Go to page ${item}`}>
              <Button variant="ghost" size="sm" className="min-w-9 tabular-nums">
                {item}
              </Button>
            </Link>
          )
        )}

        {edgeButton("Last", totalPages, page === totalPages)}
      </nav>
    </div>
  );
}
