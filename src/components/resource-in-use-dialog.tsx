"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, ShieldAlert } from "lucide-react";

export interface InUseTarget {
  id: string;
  name: string;
  rules: number;
  overrides: number;
}

/**
 * Shown when a resource can't be deleted because rules or overrides still
 * reference it. It names what is blocking and links to those rules, filtered
 * to this resource — otherwise the user is told "remove them first" with no
 * way to find them among every rule in the system.
 */
export function ResourceInUseDialog({
  target,
  resourceType,
  onClose,
}: {
  /** Null closes the dialog. */
  target: InUseTarget | null;
  resourceType: string;
  onClose: () => void;
}) {
  const open = target !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Still in use
          </DialogTitle>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{target.name}</span>{" "}
              can&apos;t be deleted yet — it is still assigned.
            </p>

            <ul className="space-y-1.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
              {target.rules > 0 && (
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Assignment rules</span>
                  <span className="font-medium tabular-nums">{target.rules}</span>
                </li>
              )}
              {target.overrides > 0 && (
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">User overrides</span>
                  <span className="font-medium tabular-nums">{target.overrides}</span>
                </li>
              )}
            </ul>

            <p className="text-sm text-muted-foreground">
              Remove these first, then the resource can be deleted.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              {target.rules > 0 && (
                <Link
                  href={`/assignments?resourceType=${resourceType}&resourceId=${target.id}`}
                >
                  <Button size="sm" className="gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    View its rules
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
