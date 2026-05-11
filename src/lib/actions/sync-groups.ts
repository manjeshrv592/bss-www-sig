"use server";

import { prisma } from "@/lib/prisma";
import { fetchAllGraphGroups, fetchGroupMembers } from "@/lib/graph";
import { logActivity } from "@/lib/activity";

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

    await prisma.syncMeta.upsert({
      where: { syncType: "groups" },
      update: {
        lastSync: new Date(),
        status: "completed",
        details: `Synced ${graphGroups.length} groups (${created} created, ${updated} updated, ${totalMembers} memberships)`,
      },
      create: {
        syncType: "groups",
        lastSync: new Date(),
        status: "completed",
        details: `Synced ${graphGroups.length} groups (${created} created, ${updated} updated, ${totalMembers} memberships)`,
      },
    });

    await logActivity({
      action: `Synced ${graphGroups.length} groups from Microsoft Graph (${created} new, ${updated} updated, ${totalMembers} memberships)`,
      entity: "groups",
    });

    return { success: true, total: graphGroups.length, created, updated, totalMembers };
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
