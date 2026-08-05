"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  country: "Country",
  state: "State / Province",
  office: "Office",
  job_title: "Job Title",
  group: "Group",
};

export async function createAssignment(data: {
  scope: string;
  scopeValue?: string;
  resourceType: string;
  resourceId: string;
}) {
  const scopeValue = data.scope === "global" ? null : (data.scopeValue ?? null);

  const existing = await prisma.assignment.findFirst({
    where: {
      scope: data.scope,
      scopeValue,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    },
  });

  const assignment = existing ?? await prisma.assignment.create({
    data: {
      scope: data.scope,
      scopeValue,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    },
  });

  const scopeLabel = SCOPE_LABELS[data.scope] ?? data.scope;
  const valueLabel = data.scopeValue ? ` (${data.scopeValue})` : "";
  await logActivity({
    action: `Assigned ${data.resourceType} to ${scopeLabel}${valueLabel}`,
    entity: "assignment",
    entityId: assignment.id,
  });

  revalidatePath("/assignments");
  return assignment;
}

export async function deleteAssignment(id: string) {
  const assignment = await prisma.assignment.delete({ where: { id } });
  const scopeLabel = SCOPE_LABELS[assignment.scope] ?? assignment.scope;
  const valueLabel = assignment.scopeValue ? ` (${assignment.scopeValue})` : "";
  await logActivity({
    action: `Removed ${assignment.resourceType} from ${scopeLabel}${valueLabel}`,
    entity: "assignment",
    entityId: id,
  });
  revalidatePath("/assignments");
}

export async function setUserOverride(data: {
  msUserId: string;
  resources: { resourceType: string; resourceId: string }[];
}) {
  // Delete existing overrides and replace
  await prisma.userOverride.deleteMany({ where: { msUserId: data.msUserId } });

  if (data.resources.length > 0) {
    await prisma.userOverride.createMany({
      data: data.resources.map((r) => ({
        msUserId: data.msUserId,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
      })),
    });
  }

  const user = await prisma.msUser.findUnique({
    where: { id: data.msUserId },
    select: { displayName: true, email: true },
  });
  const label = user?.displayName ?? user?.email ?? data.msUserId;

  await logActivity({
    action: data.resources.length > 0
      ? `Set override for ${label} (${data.resources.length} resources)`
      : `Cleared override for ${label}`,
    entity: "user_override",
    entityId: data.msUserId,
  });

  revalidatePath(`/users/${data.msUserId}`);
}

export async function clearUserOverride(msUserId: string) {
  await setUserOverride({ msUserId, resources: [] });
}
