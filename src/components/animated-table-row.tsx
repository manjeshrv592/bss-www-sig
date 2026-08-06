"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";

/**
 * Table body whose rows animate out when removed. Wraps `AnimatePresence` so
 * the lists don't each repeat it and the timing is tuned in one place.
 *
 * Default (sync) mode is deliberate: `popLayout` positions exiting children
 * absolutely, which a table's layout algorithm ignores — rows would jump. Here
 * the row keeps its space while fading, then the rest close up naturally.
 */
export function AnimatedTableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </tbody>
  );
}

/**
 * Native HTML5 drag handlers, which `useDragOrder` supplies for reordering.
 * motion types `onDragStart`/`onDragEnd` as its own pan gestures, so they are
 * declared here and passed through separately.
 */
type NativeDragProps = Pick<
  React.HTMLAttributes<HTMLTableRowElement>,
  "onDragStart" | "onDragOver" | "onDrop" | "onDragEnd"
> & { draggable?: boolean };

/**
 * A table row that fades and slides away on removal. `key` must be stable and
 * unique — AnimatePresence uses it to notice the row has gone.
 */
export function AnimatedTableRow({
  children,
  className,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  children: React.ReactNode;
  className?: string;
} & NativeDragProps) {
  // The cast is contained here rather than repeated at every call site: motion
  // reserves these prop names for its own drag gestures, but renders a real
  // <tr>, so the native handlers attach and behave normally. Only the two type
  // definitions disagree.
  const nativeDrag = {
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  } as unknown as Record<string, unknown>;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
      {...nativeDrag}
    >
      {children}
    </motion.tr>
  );
}

/**
 * Replaces a row while its delete is pending: the item's name, a countdown and
 * an Undo button, in the row's own place. The offer sits where the user just
 * clicked instead of in a corner of the screen.
 *
 * `colSpan` must match the table's column count or the row will not fill it.
 */
export function UndoDeleteRow({
  colSpan,
  label,
  secondsLeft,
  progress,
  onUndo,
}: {
  colSpan: number;
  label: string;
  secondsLeft: number;
  /** 1 → 0 as the window closes. */
  progress: number;
  onUndo: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="border-b border-border/40 bg-gradient-accent-soft last:border-0"
    >
      <td colSpan={colSpan} className="relative px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Deleted <span className="font-medium text-foreground">{label}</span>
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className="tabular-nums text-xs text-muted-foreground"
              aria-live="off"
            >
              {secondsLeft}s
            </span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onUndo}>
              <RotateCcw className="h-3 w-3" />
              Undo
            </Button>
          </div>
        </div>
        {/* Drains left to right so the remaining time is readable at a glance,
            without needing to read the number. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary/60"
          style={{ transform: `scaleX(${progress})` }}
        />
      </td>
    </motion.tr>
  );
}
