"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Checkbox selection for a table.
 *
 * `visibleIds` is the current page. Selection is pruned to it on read rather
 * than on change, so ids that leave the page — deleted, filtered, paged past —
 * can never linger and get swept into a later bulk action.
 */
export function useRowSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => new Set(visibleIds), [visibleIds]);
  const ids = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /**
   * Select or clear a specific set. A table split into groups gives each
   * header its own ids, so ticking one group's header doesn't reach into the
   * others.
   */
  const toggleMany = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allChosen = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allChosen) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => toggleMany(visibleIds), [toggleMany, visibleIds]);

  /** Checkbox state for any subset — checked, unchecked, or a dash. */
  const stateFor = useCallback(
    (ids: string[]): boolean | "indeterminate" => {
      const chosen = ids.filter((id) => selected.has(id)).length;
      if (chosen === 0) return false;
      return chosen === ids.length ? true : "indeterminate";
    },
    [selected]
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback(
    (id: string) => selected.has(id) && visible.has(id),
    [selected, visible]
  );

  return {
    ids,
    count: ids.length,
    isSelected,
    toggle,
    toggleMany,
    toggleAll,
    clear,
    stateFor,
    /** Header state for the whole page; a dash when only some are chosen. */
    headerState: stateFor(visibleIds),
  };
}
