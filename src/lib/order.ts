/**
 * Reordering logic for lists backed by a `sortOrder` column.
 *
 * Kept out of the server-action file so it can be unit-tested: a "use server"
 * module may only export async actions, and actions need a request scope.
 */

/**
 * Return `all` with `id` moved to `toIndex`, or null when nothing changes.
 * `toIndex` is absolute across the whole list and is clamped to its bounds.
 */
export function movedOrder<T extends { id: string }>(
  all: T[],
  id: string,
  toIndex: number
): T[] | null {
  const from = all.findIndex((r) => r.id === id);
  if (from < 0) return null;

  const to = Math.max(0, Math.min(toIndex, all.length - 1));
  if (from === to) return null;

  const next = [...all];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
