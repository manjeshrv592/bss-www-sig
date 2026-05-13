"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

// ─── Certifications ────────────────────────────

export async function createCertification(data: {
  name: string;
  image?: string;
  alt?: string;
}) {
  const cert = await prisma.certification.create({ data });
  await logActivity({
    action: `Created certification "${data.name}"`,
    entity: "certification",
    entityId: cert.id,
  });
  revalidatePath("/certifications");
  return cert;
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
  const banner = await prisma.banner.create({
    data: {
      ...data,
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

// ─── Legal Texts ───────────────────────────────

export async function createLegalText(data: {
  name: string;
  content: string;
}) {
  const text = await prisma.legalText.create({ data });
  await logActivity({
    action: `Created legal text "${data.name}"`,
    entity: "legal_text",
    entityId: text.id,
  });
  revalidatePath("/legal-texts");
  return text;
}

export async function updateLegalText(
  id: string,
  data: { name?: string; content?: string; isActive?: boolean }
) {
  const text = await prisma.legalText.update({ where: { id }, data });
  await logActivity({
    action: `Updated legal text "${text.name}"`,
    entity: "legal_text",
    entityId: id,
  });
  revalidatePath("/legal-texts");
  return text;
}

export async function deleteLegalText(id: string) {
  const text = await prisma.legalText.delete({ where: { id } });
  await logActivity({
    action: `Deleted legal text "${text.name}"`,
    entity: "legal_text",
    entityId: id,
  });
  revalidatePath("/legal-texts");
}
