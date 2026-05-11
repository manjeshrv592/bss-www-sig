"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncUsers } from "@/lib/actions/sync-users";
import { useRouter } from "next/navigation";

export function SyncButton({ lastStatus }: { lastStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = () => {
    setResult(null);
    startTransition(async () => {
      const res = await syncUsers();
      if (res.success) {
        setResult(`Synced ${res.total} users (${res.created} new, ${res.updated} updated)`);
      } else {
        setResult(`Error: ${res.error}`);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button onClick={handleSync} disabled={isPending} size="sm" className="gap-2">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {isPending ? "Syncing..." : "Sync Users"}
      </Button>
    </div>
  );
}
