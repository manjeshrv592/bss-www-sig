"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Search box for a server-rendered list. Debounces typing into the `q` URL
 * param — the page reads it and filters in the database — and drops `page` so
 * a new search starts from the first page.
 */
export function ListSearch({
  defaultValue = "",
  placeholder,
}: {
  defaultValue?: string;
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    if (value.trim() === currentQuery) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, router, pathname, searchParams]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        // Height from padding like Button/Select (42px); native clear button
        // hidden because we draw our own.
        className="h-auto py-2.5 pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {isPending ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
}
