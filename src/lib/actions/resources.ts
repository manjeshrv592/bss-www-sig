"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { movedOrder } from "@/lib/order";

// ─── Certifications ────────────────────────────

export async function createCertification(data: {
  name: string;
  image?: string;
  alt?: string;
}) {
  // New certifications go to the end of the strip.
  const last = await prisma.certification.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const cert = await prisma.certification.create({
    data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  await logActivity({
    action: `Created certification "${data.name}"`,
    entity: "certification",
    entityId: cert.id,
  });
  revalidatePath("/certifications");
  return cert;
}

/**
 * Persist a new certification order. `orderedIds` must be the full list of
 * certification ids in their intended display order.
 */
export async function reorderCertifications(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.certification.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  await logActivity({
    action: `Reordered certifications`,
    entity: "certification",
  });
  revalidatePath("/certifications");
}

export async function updateCertification(
  id: string,
  data: { name?: string; image?: string; alt?: string; isActive?: boolean }
) {
  const cert = await prisma.certification.update({ where: { id }, data });
  await logActivity({
    action: `Updated certification "${cert.name}"`,
    entity: "certification",
    entityId: id,
  });
  revalidatePath("/certifications");
  return cert;
}

export async function deleteCertification(id: string) {
  const cert = await prisma.certification.delete({ where: { id } });
  await logActivity({
    action: `Deleted certification "${cert.name}"`,
    entity: "certification",
    entityId: id,
  });
  revalidatePath("/certifications");
}

// ─── Banners ───────────────────────────────────

export async function createBanner(data: {
  name: string;
  image?: string;
  alt?: string;
  link?: string;
  startDate?: string | null;
  endDate?: string | null;
}) {
  // New banners go to the end of the stack.
  const last = await prisma.banner.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const banner = await prisma.banner.create({
    data: {
      ...data,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
  await logActivity({
    action: `Created banner "${data.name}"`,
    entity: "banner",
    entityId: banner.id,
  });
  revalidatePath("/banners");
  return banner;
}

export async function updateBanner(
  id: string,
  data: {
    name?: string;
    image?: string;
    alt?: string;
    link?: string;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  
  // Handle dates: null = clear, string = set, undefined = don't change
  if (data.startDate === null) {
    updateData.startDate = null;
  } else if (data.startDate) {
    updateData.startDate = new Date(data.startDate);
  } else {
    delete updateData.startDate;
  }
  
  if (data.endDate === null) {
    updateData.endDate = null;
  } else if (data.endDate) {
    updateData.endDate = new Date(data.endDate);
  } else {
    delete updateData.endDate;
  }

  const banner = await prisma.banner.update({
    where: { id },
    data: updateData,
  });
  await logActivity({
    action: `Updated banner "${banner.name}"`,
    entity: "banner",
    entityId: id,
  });
  revalidatePath("/banners");
  return banner;
}

export async function deleteBanner(id: string) {
  const banner = await prisma.banner.delete({ where: { id } });
  await logActivity({
    action: `Deleted banner "${banner.name}"`,
    entity: "banner",
    entityId: id,
  });
  revalidatePath("/banners");
}

/**
 * Persist a new banner order. `orderedIds` must be the full list of banner ids
 * in their intended display order.
 */
export async function reorderBanners(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.banner.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  await logActivity({ action: `Reordered banners`, entity: "banner" });
  revalidatePath("/banners");
}

// ─── Disclaimers ───────────────────────────────

export async function createDisclaimer(data: {
  name: string;
  content: string;
}) {
  // New disclaimers go to the end.
  const last = await prisma.disclaimer.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const text = await prisma.disclaimer.create({
    data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  await logActivity({
    action: `Created disclaimer "${data.name}"`,
    entity: "disclaimer",
    entityId: text.id,
  });
  revalidatePath("/disclaimers");
  return text;
}

export async function updateDisclaimer(
  id: string,
  data: { name?: string; content?: string; isActive?: boolean }
) {
  const text = await prisma.disclaimer.update({ where: { id }, data });
  await logActivity({
    action: `Updated disclaimer "${text.name}"`,
    entity: "disclaimer",
    entityId: id,
  });
  revalidatePath("/disclaimers");
  return text;
}

export async function deleteDisclaimer(id: string) {
  const text = await prisma.disclaimer.delete({ where: { id } });
  await logActivity({
    action: `Deleted disclaimer "${text.name}"`,
    entity: "disclaimer",
    entityId: id,
  });
  revalidatePath("/disclaimers");
}

/**
 * Persist a new disclaimer order. `orderedIds` must be the full list of
 * disclaimer ids in their intended display order.
 */
// ─── Registration Lines ────────────────────────

export async function createRegistrationLine(data: {
  name: string;
  text: string;
}) {
  const line = await prisma.registrationLine.create({ data });
  await logActivity({
    action: `Created registration line "${data.name}"`,
    entity: "registration_line",
    entityId: line.id,
  });
  revalidatePath("/registration-lines");
  return line;
}

export async function updateRegistrationLine(
  id: string,
  data: { name?: string; text?: string; isActive?: boolean }
) {
  const line = await prisma.registrationLine.update({ where: { id }, data });
  await logActivity({
    action: `Updated registration line "${line.name}"`,
    entity: "registration_line",
    entityId: id,
  });
  revalidatePath("/registration-lines");
  return line;
}

export async function deleteRegistrationLine(id: string) {
  const removed = await prisma.registrationLine.delete({ where: { id } });
  // Assignments reference resources by loose id, so clean up by hand.
  await prisma.assignment.deleteMany({
    where: { resourceType: "registration_line", resourceId: id },
  });
  await prisma.userOverride.deleteMany({
    where: { resourceType: "registration_line", resourceId: id },
  });
  await logActivity({
    action: `Deleted registration line "${removed.name}"`,
    entity: "registration_line",
    entityId: id,
  });
  revalidatePath("/registration-lines");
}

// ─── Footer Lines ──────────────────────────────

export async function createFooterLine(data: {
  name: string;
  leftText: string;
  rightText: string;
}) {
  const line = await prisma.footerLine.create({ data });
  await logActivity({
    action: `Created footer line "${data.name}"`,
    entity: "footer_line",
    entityId: line.id,
  });
  revalidatePath("/footer-lines");
  return line;
}

export async function updateFooterLine(
  id: string,
  data: { name?: string; leftText?: string; rightText?: string; isActive?: boolean }
) {
  const line = await prisma.footerLine.update({ where: { id }, data });
  await logActivity({
    action: `Updated footer line "${line.name}"`,
    entity: "footer_line",
    entityId: id,
  });
  revalidatePath("/footer-lines");
  return line;
}

export async function deleteFooterLine(id: string) {
  const line = await prisma.footerLine.delete({ where: { id } });
  await prisma.assignment.deleteMany({
    where: { resourceType: "footer_line", resourceId: id },
  });
  await prisma.userOverride.deleteMany({
    where: { resourceType: "footer_line", resourceId: id },
  });
  await logActivity({
    action: `Deleted footer line "${line.name}"`,
    entity: "footer_line",
    entityId: id,
  });
  revalidatePath("/footer-lines");
}

export async function reorderDisclaimers(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.disclaimer.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  await logActivity({ action: `Reordered disclaimers`, entity: "disclaimer" });
  revalidatePath("/disclaimers");
}

// ─── Ordering ──────────────────────────────────
//
// Lists are paginated, so the client can't send the full order — it sends one
// id and the absolute position it should occupy. The server holds the complete
// ordering, which also keeps concurrent edits from clobbering each other.

const ORDER_BY = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Move a certification to an absolute position in the full list. */
export async function moveCertification(id: string, toIndex: number) {
  const all = await prisma.certification.findMany({ orderBy: ORDER_BY, select: { id: true } });
  const next = movedOrder(all, id, toIndex);
  if (!next) return;
  await prisma.$transaction(
    next.map((r, i) => prisma.certification.update({ where: { id: r.id }, data: { sortOrder: i } }))
  );
  await logActivity({ action: `Reordered certifications`, entity: "certification" });
  revalidatePath("/certifications");
}

/** Move a banner to an absolute position in the full list. */
export async function moveBanner(id: string, toIndex: number) {
  const all = await prisma.banner.findMany({ orderBy: ORDER_BY, select: { id: true } });
  const next = movedOrder(all, id, toIndex);
  if (!next) return;
  await prisma.$transaction(
    next.map((r, i) => prisma.banner.update({ where: { id: r.id }, data: { sortOrder: i } }))
  );
  await logActivity({ action: `Reordered banners`, entity: "banner" });
  revalidatePath("/banners");
}

/** Move a disclaimer to an absolute position in the full list. */
export async function moveDisclaimer(id: string, toIndex: number) {
  const all = await prisma.disclaimer.findMany({ orderBy: ORDER_BY, select: { id: true } });
  const next = movedOrder(all, id, toIndex);
  if (!next) return;
  await prisma.$transaction(
    next.map((r, i) => prisma.disclaimer.update({ where: { id: r.id }, data: { sortOrder: i } }))
  );
  await logActivity({ action: `Reordered disclaimers`, entity: "disclaimer" });
  revalidatePath("/disclaimers");
}
