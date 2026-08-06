"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Catches render and data-fetching errors in any dashboard route, keeping the
 * sidebar usable instead of replacing the whole app with a bare error screen.
 *
 * Note the prop is `unstable_retry`, not `reset` — renamed in this Next
 * version; the old name is silently undefined and the retry button dead.
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Production strips the message from the client, so the digest is the only
    // way to tie this back to the corresponding server log entry.
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">
              This page couldn&apos;t be loaded. Retrying will re-run the query.
            </p>
          </div>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
          <Button onClick={() => unstable_retry()} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
