"use client";

import { GripVertical } from "lucide-react";

/**
 * Leading table cell for drag-sortable lists: a grip handle plus the row's
 * 1-based position. Pair with `useDragOrder`.
 */
export function OrderCell({
  index,
  handleProps,
}: {
  index: number;
  handleProps: React.ComponentProps<"button">;
}) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          {...handleProps}
          className="cursor-grab rounded text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
      </div>
    </td>
  );
}
