"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_DELAY_MS = 5000;

/**
 * Deletion with an undo window, replacing a blocking `confirm()`.
 *
 * Two shapes, because one undo should match one action:
 *  - a single row is covered by a panel offering Undo, in its own place;
 *  - a bulk delete hides every chosen row at once and offers one Undo in the
 *    selection bar. N separate panels would make undoing a ten-row delete ten
 *    decisions.
 *
 * State is exposed as lookups rather than by owning the list, so this composes
 * with hooks that already own it — `useDragOrder`, for instance.
 */
export function useUndoableDelete({
  onDelete,
  onDeleteMany,
  delayMs = DEFAULT_DELAY_MS,
}: {
  onDelete: (id: string) => Promise<void>;
  /** One round trip for a bulk delete; falls back to `onDelete` per id. */
  onDeleteMany?: (ids: string[]) => Promise<void>;
  delayMs?: number;
}) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  /** Ids of the in-flight bulk delete, if any. Empty means none. */
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forget = useCallback((ids: string[]) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const runDelete = useCallback(
    async (ids: string[]) => {
      try {
        if (ids.length > 1 && onDeleteMany) await onDeleteMany(ids);
        else for (const id of ids) await onDelete(id);
        router.refresh();
      } catch (error) {
        // The rows still exist on the server, so put them back rather than
        // leaving the list quietly out of step with the database. The server's
        // own message is shown — a refusal explains which rules still use the
        // resource, which a generic failure notice would throw away.
        console.error("Delete failed:", error);
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "Couldn't delete that. It has been restored.";
        toast.error(reason);
        forget(ids);
      }
    },
    [onDelete, onDeleteMany, router, forget]
  );

  // ── Single row ─────────────────────────────────────────
  const requestDelete = useCallback(
    (id: string) => {
      if (timers.current.has(id)) return;
      setPendingIds((prev) => new Set(prev).add(id));
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          void runDelete([id]);
        }, delayMs)
      );
    },
    [runDelete, delayMs]
  );

  const undo = useCallback(
    (id: string) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
      forget([id]);
    },
    [forget]
  );

  // ── Bulk ───────────────────────────────────────────────
  const requestDeleteMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0 || batchTimer.current) return;
      setPendingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      setBatchIds(ids);
      batchTimer.current = setTimeout(() => {
        batchTimer.current = null;
        setBatchIds([]);
        void runDelete(ids);
      }, delayMs);
    },
    [runDelete, delayMs]
  );

  const undoBatch = useCallback(() => {
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = null;
    forget(batchIds);
    setBatchIds([]);
  }, [batchIds, forget]);

  // Reachable from the unmount cleanup without making that effect re-run — and
  // fire the pending deletes early — whenever a dependency's identity changes.
  const flushRef = useRef<{ single: string[]; batch: string[] }>({ single: [], batch: [] });
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    flushRef.current = { single: [...timers.current.keys()], batch: batchIds };
    onDeleteRef.current = onDelete;
  });

  // Navigating away is not an undo: flush anything still waiting so the delete
  // the user asked for actually happens.
  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      for (const timer of timersAtMount.values()) clearTimeout(timer);
      timersAtMount.clear();
      if (batchTimer.current) clearTimeout(batchTimer.current);
      const { single, batch } = flushRef.current;
      for (const id of [...single, ...batch]) {
        void onDeleteRef.current(id).catch((e) =>
          console.error("Delete failed:", e)
        );
      }
    };
  }, []);

  return {
    /** True while the row is hidden or covered, awaiting its undo window. */
    isPendingDelete: useCallback((id: string) => pendingIds.has(id), [pendingIds]),
    /** True only for rows removed by a bulk delete, which have no in-row panel. */
    isPendingBatch: useCallback(
      (id: string) => batchIds.includes(id),
      [batchIds]
    ),
    /** How many rows the in-flight bulk delete covers; 0 when none. */
    batchCount: batchIds.length,
    /** Window length, so the countdown bars drain over exactly this long. */
    durationMs: delayMs,
    requestDelete,
    requestDeleteMany,
    undo,
    undoBatch,
  };
}
