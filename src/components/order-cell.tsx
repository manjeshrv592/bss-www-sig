"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

/**
 * Leading table cell for drag-sortable lists: a grip handle plus an editable
 * position. Pair with `useDragOrder`.
 *
 * The number is editable because dragging can only reach rows on the current
 * page — typing a position is how a row moves to another page.
 */
export function OrderCell({
  index,
  total,
  handleProps,
  onMoveTo,
}: {
  /** Absolute 0-based index across the whole list. */
  index: number;
  total: number;
  handleProps: React.ComponentProps<"button">;
  onMoveTo: (toIndex: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(index + 1);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    // Positions are shown 1-based; ignore blanks and out-of-range input.
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > total) return;
    if (parsed - 1 !== index) onMoveTo(parsed - 1);
  };

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
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Position ${index + 1} of ${total}. Type a number to move.`}
          value={shown}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          className="w-9 rounded border border-transparent bg-transparent px-1 py-0.5 text-center text-xs tabular-nums text-muted-foreground hover:border-input focus:border-input focus:bg-background focus:text-foreground focus:outline-none"
        />
      </div>
    </td>
  );
}
