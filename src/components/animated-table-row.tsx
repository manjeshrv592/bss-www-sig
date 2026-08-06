"use client";

import { AnimatePresence, motion } from "motion/react";

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
