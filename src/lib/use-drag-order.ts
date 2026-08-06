"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Options<T> {
  /** Rows on the current page, already in order. */
  items: T[];
  /** Absolute index of the first row on this page. */
  offset: number;
  /** Total rows across all pages. */
  total: number;
  /** Move one row to an absolute position in the full list. */
  move: (id: string, toIndex: number) => Promise<void>;
}

/**
 * Drag-to-reorder for a paginated list ordered by a `sortOrder` column.
 *
 * Positions are absolute across the whole list, not per page: dragging within
 * the page reorders locally, while the position box can send a row to any index
 * — including onto another page, which dragging cannot reach. Only the moved id
 * and its target index go to the server, so a page holds no stale copy of the
 * full ordering.
 *
 * Rows are draggable only while the grip handle is held, so buttons inside a
 * row and ordinary text selection keep working. Native HTML5 drag events — no
 * drag-and-drop dependency.
 */
export function useDragOrder<T extends { id: string }>({
  items: source,
  offset,
  total,
  move: persistMove,
}: Options<T>) {
  const router = useRouter();
  const [isReordering, startTransition] = useTransition();

  // Local copy so a drag applies instantly; re-synced during render whenever
  // the server sends a fresh page.
  const [items, setItems] = useState(source);
  const [syncedFrom, setSyncedFrom] = useState(source);
  if (syncedFrom !== source) {
    setSyncedFrom(source);
    setItems(source);
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [handleHeld, setHandleHeld] = useState(false);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
    setHandleHeld(false);
  };

  /** `to` is an index within the current page. */
  const moveOnPage = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const id = items[from].id;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    startTransition(async () => {
      await persistMove(id, offset + to);
      router.refresh();
    });
  };

  /** `toAbsolute` is 0-based across the entire list, so it may leave this page. */
  const moveTo = (id: string, toAbsolute: number) => {
    const clamped = Math.max(0, Math.min(toAbsolute, total - 1));
    startTransition(async () => {
      await persistMove(id, clamped);
      router.refresh();
    });
  };

  /** Spread onto each row element. */
  const getRowProps = (index: number) => ({
    draggable: handleHeld,
    onDragStart: (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Firefox requires data to be set for a drag to start.
      e.dataTransfer.setData("text/plain", items[index].id);
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverIndex(index);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex !== null) moveOnPage(dragIndex, index);
      reset();
    },
    onDragEnd: reset,
  });

  /** Drag-state classes for the row; append to the row's own classes. */
  const rowStateClass = (index: number) =>
    [
      dragIndex === index ? "opacity-40" : "",
      overIndex === index && dragIndex !== null && dragIndex !== index
        ? "outline outline-2 -outline-offset-2 outline-primary"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  /** Spread onto the grip handle button. `label` names the row for screen readers. */
  const getHandleProps = (index: number, label: string) => ({
    "aria-label": `Reorder ${label}. Use arrow up and arrow down keys to move.`,
    onMouseDown: () => setHandleHeld(true),
    onMouseUp: () => setHandleHeld(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        // At the top of a page, step onto the previous page rather than stall.
        if (index === 0) moveTo(items[index].id, offset - 1);
        else moveOnPage(index, index - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (index === items.length - 1) moveTo(items[index].id, offset + index + 1);
        else moveOnPage(index, index + 1);
      }
    },
  });

  return { items, isReordering, offset, total, getRowProps, rowStateClass, getHandleProps, moveTo };
}
