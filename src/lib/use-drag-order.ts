"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Drag-to-reorder for a list of records that carry a `sortOrder` column.
 *
 * Rows reorder optimistically and the new order is persisted through
 * `persist`, which receives every id in its intended order. Rows are only
 * draggable while the grip handle is held, so buttons inside a row and normal
 * text selection keep working.
 *
 * Uses native HTML5 drag events — no drag-and-drop dependency.
 */
export function useDragOrder<T extends { id: string }>(
  source: T[],
  persist: (orderedIds: string[]) => Promise<void>
) {
  const router = useRouter();
  const [isReordering, startTransition] = useTransition();

  // Local copy so a drag applies instantly; re-synced during render whenever
  // the server sends a fresh list.
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

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    startTransition(async () => {
      await persist(next.map((i) => i.id));
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
      if (dragIndex !== null) move(dragIndex, index);
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
        move(index, index - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(index, index + 1);
      }
    },
  });

  return { items, isReordering, getRowProps, rowStateClass, getHandleProps };
}
