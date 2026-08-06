"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_DELAY_MS = 5000;
/** Fast enough that the countdown never visibly skips a second. */
const TICK_MS = 200;

/**
 * Deletion with an undo window, replacing a blocking `confirm()`.
 *
 * The row turns into an "Deleted — Undo" strip in place, counting down, and the
 * server action runs only once that window closes. Keeping it in the row means
 * the offer sits where the user's attention already is, rather than in a corner
 * of the screen they may never look at.
 *
 * State is exposed as lookups rather than by owning the list, so this composes
 * with hooks that already own it — `useDragOrder`, for instance.
 */
export function useUndoableDelete({
  onDelete,
  delayMs = DEFAULT_DELAY_MS,
}: {
  onDelete: (id: string) => Promise<void>;
  delayMs?: number;
}) {
  const router = useRouter();
  /** id -> timestamp at which the delete commits. */
  const [pending, setPending] = useState<Map<string, number>>(new Map());
  const [now, setNow] = useState(0);

  const forget = useCallback((id: string) => {
    setPending((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const commit = useCallback(
    async (id: string) => {
      try {
        await onDelete(id);
        router.refresh();
      } catch (error) {
        // The row still exists on the server, so put it back rather than
        // leaving the list quietly out of step with the database.
        console.error("Delete failed:", error);
        toast.error("Couldn't delete that. It has been restored.");
        router.refresh();
      }
    },
    [onDelete, router]
  );

  // One interval drives both the countdown and the commit, so what the user
  // sees and what actually fires can never disagree.
  useEffect(() => {
    if (pending.size === 0) return;

    const tick = () => {
      const current = Date.now();
      const expired = [...pending.entries()]
        .filter(([, expiresAt]) => expiresAt <= current)
        .map(([id]) => id);

      if (expired.length > 0) {
        setPending((prev) => {
          const next = new Map(prev);
          for (const id of expired) next.delete(id);
          return next;
        });
        for (const id of expired) void commit(id);
      }
      setNow(current);
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [pending, commit]);

  // Keeps the latest pending set reachable from the unmount cleanup without
  // making that effect re-run (and fire early) every time the set changes.
  // Synced in an effect rather than during render, which React disallows.
  const pendingRef = useRef(pending);
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    pendingRef.current = pending;
    onDeleteRef.current = onDelete;
  });

  // Navigating away is not an undo: flush anything still waiting so the delete
  // the user asked for actually happens.
  useEffect(() => {
    return () => {
      for (const id of pendingRef.current.keys()) {
        void onDeleteRef.current(id).catch((e) =>
          console.error("Delete failed:", e)
        );
      }
    };
  }, []);

  const requestDelete = useCallback(
    (id: string) => {
      setPending((prev) => {
        if (prev.has(id)) return prev;
        return new Map(prev).set(id, Date.now() + delayMs);
      });
    },
    [delayMs]
  );

  const undo = useCallback((id: string) => forget(id), [forget]);

  return {
    /** True while the row is showing its undo strip. */
    isPendingDelete: useCallback((id: string) => pending.has(id), [pending]),
    /** Whole seconds left, for the countdown. */
    secondsLeft: useCallback(
      (id: string) => {
        const expiresAt = pending.get(id);
        if (expiresAt === undefined) return 0;
        return Math.max(0, Math.ceil((expiresAt - now) / 1000));
      },
      [pending, now]
    ),
    /** 1 → 0 as the window closes, for the progress bar. */
    progress: useCallback(
      (id: string) => {
        const expiresAt = pending.get(id);
        if (expiresAt === undefined) return 0;
        return Math.max(0, Math.min(1, (expiresAt - now) / delayMs));
      },
      [pending, now, delayMs]
    ),
    requestDelete,
    undo,
  };
}
