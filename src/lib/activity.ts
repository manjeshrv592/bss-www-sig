import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

export type ActivityWithUser = Prisma.ActivityLogGetPayload<{
  include: { user: { select: { name: true; email: true } } };
}>;

interface LogActivityParams {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    // auth() reads request headers, so it throws when an action is invoked
    // outside a request — from a script or a scheduled job, for instance.
    // Auditing must not decide whether those callers work.
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return null;

    return await prisma.activityLog.create({
      data: {
        userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
      },
    });
  } catch (error) {
    // Auditing must never take down the operation it is recording. The usual
    // cause is a session whose JWT still points at a users row that no longer
    // exists (e.g. the table was cleared), which trips the foreign key.
    // Callers also log from their own catch blocks, so throwing here would
    // replace the real error with this one.
    console.error("Failed to write activity log:", error);
    return null;
  }
}

export async function getRecentActivity(limit = 5) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });
}

interface GetActivityLogParams {
  page?: number;
  perPage?: number;
  entity?: string;
  action?: string;
}

export async function getActivityLog({
  page = 1,
  perPage = 20,
  entity,
  action,
}: GetActivityLogParams = {}) {
  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = { contains: action, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}
