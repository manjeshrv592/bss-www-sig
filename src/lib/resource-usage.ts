import { prisma } from "@/lib/prisma";

/**
 * Assignments and user overrides reference resources by a loose
 * `resourceType` + `resourceId` pair rather than a foreign key, so the database
 * cannot stop a resource being deleted out from under them. These helpers are
 * that guard.
 */

export type ResourceType =
  | "certification"
  | "banner"
  | "disclaimer"
  | "registration_line"
  | "footer_line";

export interface ResourceUsage {
  /** Assignment rules pointing at this resource. */
  rules: number;
  /** Per-user overrides pointing at it. */
  overrides: number;
  total: number;
}

const EMPTY: ResourceUsage = { rules: 0, overrides: 0, total: 0 };

/**
 * How many rules and overrides reference each id. Two queries regardless of how
 * many ids are passed, so a page of rows costs the same as one.
 */
export async function getResourceUsage(
  resourceType: ResourceType,
  ids: string[]
): Promise<Map<string, ResourceUsage>> {
  const usage = new Map<string, ResourceUsage>();
  if (ids.length === 0) return usage;

  const [rules, overrides] = await Promise.all([
    prisma.assignment.groupBy({
      by: ["resourceId"],
      where: { resourceType, resourceId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.userOverride.groupBy({
      by: ["resourceId"],
      where: { resourceType, resourceId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  for (const id of ids) usage.set(id, { ...EMPTY });
  for (const r of rules) {
    const u = usage.get(r.resourceId)!;
    u.rules = r._count._all;
    u.total += r._count._all;
  }
  for (const o of overrides) {
    const u = usage.get(o.resourceId)!;
    u.overrides = o._count._all;
    u.total += o._count._all;
  }
  return usage;
}

/** "2 assignment rules and 1 user override" */
export function describeUsage(usage: ResourceUsage): string {
  const parts: string[] = [];
  if (usage.rules > 0) {
    parts.push(`${usage.rules} assignment rule${usage.rules === 1 ? "" : "s"}`);
  }
  if (usage.overrides > 0) {
    parts.push(`${usage.overrides} user override${usage.overrides === 1 ? "" : "s"}`);
  }
  return parts.join(" and ");
}

/**
 * Throws unless the resource is unreferenced. The UI explains this before the
 * user commits, but that state can be stale — another admin may have assigned
 * it since the page loaded — so deletion is refused here too.
 */
export async function assertResourceUnused(
  resourceType: ResourceType,
  id: string,
  label: string
) {
  const usage = (await getResourceUsage(resourceType, [id])).get(id) ?? EMPTY;
  if (usage.total === 0) return;

  throw new Error(
    `"${label}" is still used by ${describeUsage(usage)}. Remove those first.`
  );
}

/**
 * Refuses the whole batch if any member is in use.
 *
 * Checked up front rather than per item: a bulk delete loops the single-item
 * action, so throwing partway would leave the earlier rows already deleted and
 * the operation half-applied.
 */
export async function assertManyUnused(
  resourceType: ResourceType,
  ids: string[]
) {
  const usage = await getResourceUsage(resourceType, ids);
  const blocked = ids.filter((id) => (usage.get(id)?.total ?? 0) > 0);
  if (blocked.length === 0) return;

  throw new Error(
    blocked.length === ids.length
      ? `All ${ids.length} selected items are still in use. Remove their assignments first.`
      : `${blocked.length} of ${ids.length} selected items are still in use. Remove their assignments first, or deselect them.`
  );
}
