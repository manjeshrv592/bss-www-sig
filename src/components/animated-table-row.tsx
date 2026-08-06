"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
 * Covers a row whose delete is pending. A panel slides in from the right over
 * the row's own space, carrying nothing but Undo, sat where the delete button
 * was. The draining bar is the only time cue — a number would say the same
 * thing twice.
 *
 * `colSpan` must match the table's column count or the panel won't span it.
 */
export function UndoDeleteRow({
  colSpan,
  durationMs,
  onUndo,
}: {
  colSpan: number;
  /** Length of the undo window; how long the bar takes to drain. */
  durationMs: number;
  onUndo: () => void;
}) {
  return (
    <motion.tr
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="border-b border-border/40 last:border-0"
    >
      {/* overflow-hidden clips the panel so it appears to slide in from the
          row's own right edge rather than from off-screen. */}
      <td colSpan={colSpan} className="overflow-hidden p-0">
        {/* Both animations are CSS, not motion. These sit inside an
            AnimatePresence with initial={false}, and a motion child inheriting
            that renders straight at its animate state — the bar mounted at
            scaleX(0), invisible, and the panel never slid. CSS ignores that
            context entirely. */}
        <div
          style={{ animation: "undo-slide-in 260ms cubic-bezier(0.32,0.72,0,1)" }}
          className="relative flex items-center justify-end bg-muted px-4 py-3"
        >
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onUndo}>
            <RotateCcw className="h-3 w-3" />
            Undo
          </Button>
          <span
            aria-hidden
            // Exempt from the global reduced-motion override: this bar is the
            // only cue for how long is left, so freezing it removes
            // information rather than decoration.
            data-motion-essential
            style={{
              transformOrigin: "left",
              animation: `undo-drain ${durationMs}ms linear forwards`,
            }}
            className="absolute inset-x-0 bottom-0 block h-0.5 bg-primary"
          />
        </div>
      </td>
    </motion.tr>
  );
}
