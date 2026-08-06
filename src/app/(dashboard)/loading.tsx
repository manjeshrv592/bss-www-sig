import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Streams the dashboard shell while a page's queries run. Nested inside the
 * layout, so the sidebar stays interactive and only the content area swaps.
 *
 * Shaped like the list pages most routes render — a heading, an action button
 * and a table — so the layout does not visibly jump when real content arrives.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
      </div>

      <div className="flex justify-end">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
              <div className="h-7 w-20 shrink-0 animate-pulse rounded bg-muted/40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
