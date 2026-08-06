"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_DELAY_MS = 5000;

/**
 * Deletion with an undo window, replacing a blocking `confirm()`.
 *
 * The row disappears immediately and a toast offers Undo; the server action
 * only runs once that window closes. This is faster for the common case (the
 * user meant it) and more forgiving for the rare one, whereas a confirm dialog
 * taxes every deletion to guard against the mistake.
 *
 * Hiding is exposed as a predicate rather than by owning the list, so it
 * composes with hooks that already own it — `useDragOrder`, for instance.
 */
export function useUndoableDelete({
  onDelete,
  delayMs = DEFAULT_DELAY_MS,
}: {
  onDelete: (id: string) => Promise<void>;
  delayMs?: number;
}) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const unhide = useCallback((id: string) => {
    setPendingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const commit = useCallback(
    async (id: string) => {
      timers.current.delete(id);
      try {
        await onDelete(id);
        router.refresh();
      } catch (error) {
        // The row is still there on the server, so put it back rather than
        // leaving the list quietly out of step with the database.
        console.error("Delete failed:", error);
        toast.error("Couldn't delete that. It has been restored.");
        unhide(id);
      }
    },
    [onDelete, router, unhide]
  );

  /** Hide the row, then delete it unless the user undoes within the window. */
  const requestDelete = useCallback(
    (id: string, label: string) => {
      if (timers.current.has(id)) return;

      setPendingIds((prev) => new Set(prev).add(id));
      timers.current.set(
        id,
        setTimeout(() => void commit(id), delayMs)
      );

      toast(`Deleted ${label}`, {
        duration: delayMs,
        action: {
          label: "Undo",
          onClick: () => {
            const timer = timers.current.get(id);
            if (timer) clearTimeout(timer);
            timers.current.delete(id);
            unhide(id);
          },
        },
      });
    },
    [commit, delayMs, unhide]
  );

  // Navigating away is not an undo: flush anything still waiting so the delete
  // the user asked for actually happens.
  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      for (const [id, timer] of timersAtMount) {
        clearTimeout(timer);
        void onDelete(id).catch((e) => console.error("Delete failed:", e));
      }
      timersAtMount.clear();
    };
    // Intentionally mount-only: this is unmount cleanup, and re-running it when
    // onDelete's identity changes would fire the pending deletes early.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    /** True while a row is hidden and awaiting its undo window. */
    isPendingDelete: useCallback((id: string) => pendingIds.has(id), [pendingIds]),
    requestDelete,
  };
}
