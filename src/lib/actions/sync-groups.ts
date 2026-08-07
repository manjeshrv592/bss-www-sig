"use server";

import { prisma } from "@/lib/prisma";
import { fetchAllGraphGroups, fetchGroupMembers } from "@/lib/graph";
import { logActivity } from "@/lib/activity";

/**
 * Remove groups Microsoft no longer returns. Memberships go by cascade, but
 * assignments scoped to a group hold its id in scopeValue as plain text with no
 * foreign key behind it, so they have to be cleared here or they linger as
 * rules that can never match anyone again.
 *
 * As with users, an empty result is read as a failed fetch rather than a tenant
 * with no groups, since acting on it would delete every group and every rule
 * scoped to one.
 */
async function pruneDeletedGroups(liveMsIds: string[]) {
  if (liveMsIds.length === 0) return { groups: 0, assignments: 0 };

  const live = new Set(liveMsIds);
  const known = await prisma.msGroup.findMany({ select: { id: true, msId: true } });
  const goneIds = known.filter((g) => !live.has(g.msId)).map((g) => g.id);

  if (goneIds.length === 0) return { groups: 0, assignments: 0 };

  const assignments = await prisma.assignment.deleteMany({
    where: { scope: "group", scopeValue: { in: goneIds } },
  });
  const groups = await prisma.msGroup.deleteMany({
    where: { id: { in: goneIds } },
  });

  return { groups: groups.count, assignments: assignments.count };
}

export async function syncGroups() {
  try {
    await prisma.syncMeta.upsert({
      where: { syncType: "groups" },
      update: { status: "running" },
      create: { syncType: "groups", status: "running" },
    });

    const graphGroups = await fetchAllGraphGroups();

    let created = 0;
    let updated = 0;
    let totalMembers = 0;

    for (const gg of graphGroups) {
      const existing = await prisma.msGroup.findUnique({ where: { msId: gg.id } });

      const group = await prisma.msGroup.upsert({
        where: { msId: gg.id },
        update: {
          displayName: gg.displayName,
          description: gg.description,
          mailEnabled: gg.mailEnabled,
          securityEnabled: gg.securityEnabled,
        },
        create: {
          msId: gg.id,
          displayName: gg.displayName,
          description: gg.description,
          mailEnabled: gg.mailEnabled,
          securityEnabled: gg.securityEnabled,
        },
      });

      if (existing) updated++;
      else created++;

      // Sync group members
      const memberMsIds = await fetchGroupMembers(gg.id);

      // Get msUser IDs for these Microsoft IDs
      const msUsers = await prisma.msUser.findMany({
        where: { msId: { in: memberMsIds } },
        select: { id: true, msId: true },
      });
      const msIdToUserId = new Map(msUsers.map((u) => [u.msId, u.id]));

      // Delete old memberships for this group
      await prisma.msGroupMember.deleteMany({ where: { groupId: group.id } });

      // Create current memberships
      const memberData = memberMsIds
        .filter((msId) => msIdToUserId.has(msId))
        .map((msId) => ({
          groupId: group.id,
          msUserId: msIdToUserId.get(msId)!,
        }));

      if (memberData.length > 0) {
        await prisma.msGroupMember.createMany({ data: memberData });
      }

      totalMembers += memberData.length;
    }

    const removed = await pruneDeletedGroups(graphGroups.map((g) => g.id));

    const removedNote =
      removed.groups > 0
        ? `, ${removed.groups} removed` +
          (removed.assignments > 0
            ? ` with ${removed.assignments} assignment${removed.assignments === 1 ? "" : "s"}`
            : "")
        : "";

    const summary = `Synced ${graphGroups.length} groups (${created} created, ${updated} updated${removedNote}, ${totalMembers} memberships)`;

    await prisma.syncMeta.upsert({
      where: { syncType: "groups" },
      update: {
        lastSync: new Date(),
        status: "completed",
        details: summary,
      },
      create: {
        syncType: "groups",
        lastSync: new Date(),
        status: "completed",
        details: summary,
      },
    });

    await logActivity({
      action: `Synced ${graphGroups.length} groups from Microsoft Graph (${created} new, ${updated} updated${removedNote}, ${totalMembers} memberships)`,
      entity: "groups",
    });

    return {
      success: true,
      total: graphGroups.length,
      created,
      updated,
      totalMembers,
      removed: removed.groups,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.syncMeta.upsert({
      where: { syncType: "groups" },
      update: { status: "error", details: message },
      create: { syncType: "groups", status: "error", details: message },
    });

    await logActivity({
      action: `Group sync failed: ${message}`,
      entity: "groups",
    });

    return { success: false, error: message };
  }
}
