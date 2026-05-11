"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncGroups } from "@/lib/actions/sync-groups";
import { useRouter } from "next/navigation";

export function SyncGroupsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = () => {
    setResult(null);
    startTransition(async () => {
      const res = await syncGroups();
      if (res.success) {
        setResult(`Synced ${res.total} groups (${res.created} new, ${res.totalMembers} memberships)`);
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
        {isPending ? "Syncing..." : "Sync Groups"}
      </Button>
    </div>
  );
}
