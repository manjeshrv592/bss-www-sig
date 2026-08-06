"use client";

import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, X } from "lucide-react";

/**
 * The bar above a table: how many rows are selected and what can be done with
 * them, and — once a bulk delete is running — the single Undo for it.
 *
 * A bulk delete gets one undo here rather than a panel per row, so undoing a
 * ten-row delete stays one decision.
 *
 * Renders nothing when there is neither a selection nor a pending delete, so
 * tables can mount it unconditionally.
 */
export function BulkActionBar({
  count,
  batchCount,
  durationMs,
  onDelete,
  onClear,
  onUndo,
  noun = "item",
}: {
  /** Rows currently ticked. */
  count: number;
  /** Rows in the in-flight bulk delete; 0 when none. */
  batchCount: number;
  durationMs: number;
  onDelete: () => void;
  onClear: () => void;
  onUndo: () => void;
  /** Singular; pluralised with a trailing "s". */
  noun?: string;
}) {
  const plural = (n: number) => `${n} ${noun}${n === 1 ? "" : "s"}`;

  if (batchCount > 0) {
    return (
      <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-muted px-4 py-2.5 shadow-soft-xs">
        <span className="text-sm text-muted-foreground">
          Deleted <span className="font-medium text-foreground">{plural(batchCount)}</span>
        </span>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onUndo}>
          <RotateCcw className="h-3 w-3" />
          Undo
        </Button>
        {/* Same countdown treatment as a single row's panel — see
            UndoDeleteRow for why this is CSS and why it opts out of the
            reduced-motion override. */}
        <span
          aria-hidden
          data-motion-essential
          style={{
            transformOrigin: "left",
            animation: `undo-drain ${durationMs}ms linear forwards`,
          }}
          className="absolute inset-x-0 bottom-0 block h-0.5 bg-primary"
        />
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2.5 shadow-soft-sm">
      <span className="text-sm">
        <span className="font-medium">{plural(count)}</span> selected
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClear}>
          <X className="h-3 w-3" />
          Clear
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
