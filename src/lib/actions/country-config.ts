"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export async function createCountryConfig(data: {
  country: string;
  companyName: string;
  website?: string;
}) {
  const config = await prisma.countryConfig.create({
    data: {
      country: data.country,
      companyName: data.companyName,
      website: data.website || null,
    },
  });

  await logActivity({
    action: `Created country config for ${data.country}`,
    entity: "country_config",
    entityId: config.id,
  });

  revalidatePath("/country-config");
  return config;
}

export async function updateCountryConfig(
  id: string,
  data: { country?: string; companyName?: string; website?: string }
) {
  const config = await prisma.countryConfig.update({
    where: { id },
    data: {
      ...(data.country !== undefined && { country: data.country }),
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.website !== undefined && { website: data.website || null }),
    },
  });

  await logActivity({
    action: `Updated country config for ${config.country}`,
    entity: "country_config",
    entityId: config.id,
  });

  revalidatePath("/country-config");
  return config;
}

export async function deleteCountryConfig(id: string) {
  const config = await prisma.countryConfig.delete({ where: { id } });

  await logActivity({
    action: `Deleted country config for ${config.country}`,
    entity: "country_config",
    entityId: id,
  });

  revalidatePath("/country-config");
}
