import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  extraParams?: string;
}

export function Pagination({ page, totalPages, basePath, extraParams = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const separator = basePath.includes("?") ? "&" : "?";
  const buildHref = (p: number) =>
    `${basePath}${separator}page=${p}${extraParams ? `&${extraParams}` : ""}`;

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 && (
          <Link href={buildHref(page - 1)}>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
          </Link>
        )}
        {page < totalPages && (
          <Link href={buildHref(page + 1)}>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
