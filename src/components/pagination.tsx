import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  extraParams?: string;
}

/**
 * Page numbers with ellipses: 1 … 6 7 8 … 30
 *
 * Always shows the first and last page, plus a window around the current one,
 * so the size of the list and the way to reach either end are visible at any
 * page count. Returns page numbers and "gap" markers.
 */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  // Up to 7 pages fit without any elision.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "gap")[] = [1];

  // Keep the window the same width at the ends, where it would otherwise be
  // clipped by the first/last page — nudge it inward instead of shrinking it.
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);
  if (page <= 3) end = 4;
  if (page >= totalPages - 2) start = totalPages - 3;

  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push("gap");

  items.push(totalPages);
  return items;
}

export function Pagination({ page, totalPages, basePath, extraParams = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const separator = basePath.includes("?") ? "&" : "?";
  const buildHref = (p: number) =>
    `${basePath}${separator}page=${p}${extraParams ? `&${extraParams}` : ""}`;

  const items = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link href={buildHref(page - 1)} aria-label="Previous page">
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronLeft className="h-3 w-3" />
            Prev
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" className="gap-1" disabled>
          <ChevronLeft className="h-3 w-3" />
          Prev
        </Button>
      )}

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

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} aria-label="Next page">
          <Button variant="outline" size="sm" className="gap-1">
            Next
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" className="gap-1" disabled>
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </nav>
  );
}
