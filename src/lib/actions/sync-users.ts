"use server";

import { prisma } from "@/lib/prisma";
import { fetchAllGraphUsers } from "@/lib/graph";
import { logActivity } from "@/lib/activity";

/**
 * Remove users Microsoft no longer returns, which is how a deletion there
 * reaches us — Graph simply stops listing them.
 *
 * Their group memberships, signature overrides and shared-mailbox rows go with
 * them by cascade, on both sides of the shared-mailbox relation: deleting a
 * mailbox takes its member list, and deleting a person takes them out of every
 * mailbox they could send from.
 *
 * An empty result is treated as a failed fetch rather than an emptied tenant.
 * A directory with nobody in it cannot happen in practice, whereas a permission
 * or paging problem returning nothing very much can — and acting on it would
 * delete everyone.
 */
async function pruneDeletedUsers(liveMsIds: string[]) {
  if (liveMsIds.length === 0) return 0;

  const live = new Set(liveMsIds);
  const known = await prisma.msUser.findMany({ select: { id: true, msId: true } });
  const goneIds = known.filter((u) => !live.has(u.msId)).map((u) => u.id);

  if (goneIds.length === 0) return 0;

  const { count } = await prisma.msUser.deleteMany({
    where: { id: { in: goneIds } },
  });
  return count;
}

export async function syncUsers() {
  try {
    await prisma.syncMeta.upsert({
      where: { syncType: "users" },
      update: { status: "running" },
      create: { syncType: "users", status: "running" },
    });

    const graphUsers = await fetchAllGraphUsers();

    let created = 0;
    let updated = 0;

    for (const gu of graphUsers) {
      const email = (gu.mail ?? gu.userPrincipalName).toLowerCase();
      if (!email) continue;

      if (gu.jobTitle) {
        await prisma.jobTitle.upsert({
          where: { title: gu.jobTitle },
          update: {},
          create: { title: gu.jobTitle },
        });
      }

      const existing = await prisma.msUser.findUnique({ where: { msId: gu.id } });

      await prisma.msUser.upsert({
        where: { msId: gu.id },
        update: {
          email,
          displayName: gu.displayName,
          givenName: gu.givenName,
          surname: gu.surname,
          jobTitleRef: gu.jobTitle
            ? { connect: { title: gu.jobTitle } }
            : { disconnect: true },
          department: gu.department,
          officeLocation: gu.officeLocation,
          streetAddress: gu.streetAddress,
          city: gu.city,
          state: gu.state,
          postalCode: gu.postalCode,
          country: gu.country,
          companyName: gu.companyName,
          mobilePhone: gu.mobilePhone,
          businessPhones: gu.businessPhones ?? [],
          userPrincipalName: gu.userPrincipalName,
          accountEnabled: gu.accountEnabled ?? true,
          isLicensed: (gu.assignedLicenses?.length ?? 0) > 0,
          hasMailbox: gu.mail != null,
        },
        create: {
          msId: gu.id,
          email,
          displayName: gu.displayName,
          givenName: gu.givenName,
          surname: gu.surname,
          jobTitleRef: gu.jobTitle
            ? { connect: { title: gu.jobTitle } }
            : undefined,
          department: gu.department,
          officeLocation: gu.officeLocation,
          streetAddress: gu.streetAddress,
          city: gu.city,
          state: gu.state,
          postalCode: gu.postalCode,
          country: gu.country,
          companyName: gu.companyName,
          mobilePhone: gu.mobilePhone,
          businessPhones: gu.businessPhones ?? [],
          userPrincipalName: gu.userPrincipalName,
          accountEnabled: gu.accountEnabled ?? true,
          isLicensed: (gu.assignedLicenses?.length ?? 0) > 0,
          hasMailbox: gu.mail != null,
        },
      });

      if (existing) updated++;
      else created++;
    }

    const removed = await pruneDeletedUsers(graphUsers.map((u) => u.id));

    const summary =
      `Synced ${graphUsers.length} users (${created} created, ${updated} updated` +
      (removed > 0 ? `, ${removed} removed)` : ")");

    await prisma.syncMeta.upsert({
      where: { syncType: "users" },
      update: {
        lastSync: new Date(),
        status: "completed",
        details: summary,
      },
      create: {
        syncType: "users",
        lastSync: new Date(),
        status: "completed",
        details: summary,
      },
    });

    await logActivity({
      action: `Synced ${graphUsers.length} users from Microsoft Graph (${created} new, ${updated} updated${removed > 0 ? `, ${removed} removed` : ""})`,
      entity: "users",
    });

    return { success: true, total: graphUsers.length, created, updated, removed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.syncMeta.upsert({
      where: { syncType: "users" },
      update: { status: "error", details: message },
      create: { syncType: "users", status: "error", details: message },
    });

    await logActivity({
      action: `User sync failed: ${message}`,
      entity: "users",
    });

    return { success: false, error: message };
  }
}
