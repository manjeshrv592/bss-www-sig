"use server";

import { prisma } from "@/lib/prisma";
import { fetchAllGraphUsers } from "@/lib/graph";
import { logActivity } from "@/lib/activity";

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
        },
      });

      if (existing) updated++;
      else created++;
    }

    await prisma.syncMeta.upsert({
      where: { syncType: "users" },
      update: {
        lastSync: new Date(),
        status: "completed",
        details: `Synced ${graphUsers.length} users (${created} created, ${updated} updated)`,
      },
      create: {
        syncType: "users",
        lastSync: new Date(),
        status: "completed",
        details: `Synced ${graphUsers.length} users (${created} created, ${updated} updated)`,
      },
    });

    await logActivity({
      action: `Synced ${graphUsers.length} users from Microsoft Graph (${created} new, ${updated} updated)`,
      entity: "users",
    });

    return { success: true, total: graphUsers.length, created, updated };
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
