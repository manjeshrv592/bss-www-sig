"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

/** Mark (or unmark) an address as a shared mailbox used by several people. */
export async function setSharedMailbox(msUserId: string, isShared: boolean) {
  const user = await prisma.msUser.update({
    where: { id: msUserId },
    data: { isSharedMailbox: isShared },
    select: { email: true },
  });

  // Membership is meaningless once it is no longer a shared mailbox.
  if (!isShared) {
    await prisma.sharedMailboxMember.deleteMany({
      where: { sharedMailboxId: msUserId },
    });
  }

  await logActivity({
    action: isShared
      ? `Marked ${user.email} as a shared mailbox`
      : `Unmarked ${user.email} as a shared mailbox`,
    entity: "shared_mailbox",
    entityId: msUserId,
  });

  revalidatePath("/shared-mailboxes");
  revalidatePath(`/users/${msUserId}`);
}

export async function addSharedMailboxMember(
  sharedMailboxId: string,
  msUserId: string
) {
  if (sharedMailboxId === msUserId) {
    throw new Error("A shared mailbox cannot be a member of itself");
  }

  await prisma.sharedMailboxMember.upsert({
    where: { sharedMailboxId_msUserId: { sharedMailboxId, msUserId } },
    update: {},
    create: { sharedMailboxId, msUserId },
  });

  const [mailbox, member] = await Promise.all([
    prisma.msUser.findUnique({ where: { id: sharedMailboxId }, select: { email: true } }),
    prisma.msUser.findUnique({ where: { id: msUserId }, select: { email: true } }),
  ]);

  await logActivity({
    action: `Added ${member?.email} to shared mailbox ${mailbox?.email}`,
    entity: "shared_mailbox",
    entityId: sharedMailboxId,
  });

  revalidatePath("/shared-mailboxes");
}

export async function removeSharedMailboxMember(
  sharedMailboxId: string,
  msUserId: string
) {
  await prisma.sharedMailboxMember.deleteMany({
    where: { sharedMailboxId, msUserId },
  });

  const [mailbox, member] = await Promise.all([
    prisma.msUser.findUnique({ where: { id: sharedMailboxId }, select: { email: true } }),
    prisma.msUser.findUnique({ where: { id: msUserId }, select: { email: true } }),
  ]);

  await logActivity({
    action: `Removed ${member?.email} from shared mailbox ${mailbox?.email}`,
    entity: "shared_mailbox",
    entityId: sharedMailboxId,
  });

  revalidatePath("/shared-mailboxes");
}
