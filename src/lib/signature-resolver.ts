import { prisma } from "@/lib/prisma";

export interface CountryBranding {
  companyName: string;
  website: string | null;
}

export interface ResolvedSignature {
  certifications: { id: string; name: string; image: string | null; alt: string | null }[];
  banners: { id: string; name: string; image: string | null; alt: string | null; link: string | null }[];
  legalTexts: { id: string; name: string; content: string }[];
  countryBranding: CountryBranding;
  isOverridden: boolean;
  matchedRules: { scope: string; scopeValue: string | null }[];
}

export async function resolveSignature(msUserId: string): Promise<ResolvedSignature> {
  const user = await prisma.msUser.findUnique({
    where: { id: msUserId },
    include: { overrides: true },
  });

  if (!user) {
    return { certifications: [], banners: [], legalTexts: [], countryBranding: DEFAULT_BRANDING, isOverridden: false, matchedRules: [] };
  }

  // Resolve country branding
  const countryBranding = await resolveCountryBranding(user.country);

  // Check for user override first — replaces EVERYTHING
  if (user.overrides.length > 0) {
    const certIds = user.overrides
      .filter((o) => o.resourceType === "certification")
      .map((o) => o.resourceId);
    const bannerIds = user.overrides
      .filter((o) => o.resourceType === "banner")
      .map((o) => o.resourceId);
    const legalIds = user.overrides
      .filter((o) => o.resourceType === "legal_text")
      .map((o) => o.resourceId);

    const [certifications, banners, legalTexts] = await Promise.all([
      prisma.certification.findMany({
        where: { id: { in: certIds }, isActive: true },
        select: { id: true, name: true, image: true, alt: true },
      }),
      prisma.banner.findMany({
        where: { id: { in: bannerIds }, isActive: true },
        select: { id: true, name: true, image: true, alt: true, link: true },
      }),
      prisma.legalText.findMany({
        where: { id: { in: legalIds }, isActive: true },
        select: { id: true, name: true, content: true },
      }),
    ]);

    return { certifications, banners, legalTexts, countryBranding, isOverridden: true, matchedRules: [] };
  }

  // Build scope conditions for this user (OR logic)
  const scopeConditions: { scope: string; scopeValue: string | null }[] = [
    { scope: "global", scopeValue: null },
  ];

  if (user.country) {
    scopeConditions.push({ scope: "country", scopeValue: user.country });
  }
  if (user.jobTitle) {
    scopeConditions.push({ scope: "job_title", scopeValue: user.jobTitle });
  }

  // Add group scopes — find all groups this user belongs to
  const groupMemberships = await prisma.msGroupMember.findMany({
    where: { msUserId: msUserId },
    select: { group: { select: { id: true } } },
  });
  for (const gm of groupMemberships) {
    scopeConditions.push({ scope: "group", scopeValue: gm.group.id });
  }

  // Fetch all matching assignments (UNION / OR)
  const assignments = await prisma.assignment.findMany({
    where: {
      OR: scopeConditions.map((c) => ({
        scope: c.scope,
        scopeValue: c.scopeValue,
      })),
    },
  });

  // Deduplicate by resourceType + resourceId
  const certIdSet = new Set<string>();
  const bannerIdSet = new Set<string>();
  const legalIdSet = new Set<string>();
  const matchedRules: { scope: string; scopeValue: string | null }[] = [];

  const seenScopes = new Set<string>();
  for (const a of assignments) {
    const scopeKey = `${a.scope}:${a.scopeValue ?? ""}`;
    if (!seenScopes.has(scopeKey)) {
      seenScopes.add(scopeKey);
      matchedRules.push({ scope: a.scope, scopeValue: a.scopeValue });
    }

    if (a.resourceType === "certification") certIdSet.add(a.resourceId);
    else if (a.resourceType === "banner") bannerIdSet.add(a.resourceId);
    else if (a.resourceType === "legal_text") legalIdSet.add(a.resourceId);
  }

  const [certifications, banners, legalTexts] = await Promise.all([
    certIdSet.size > 0
      ? prisma.certification.findMany({
          where: { id: { in: [...certIdSet] }, isActive: true },
          select: { id: true, name: true, image: true, alt: true },
        })
      : Promise.resolve([]),
    bannerIdSet.size > 0
      ? prisma.banner.findMany({
          where: {
            id: { in: [...bannerIdSet] },
            isActive: true,
            OR: [
              { startDate: null },
              { startDate: { lte: new Date() } },
            ],
            AND: [
              {
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } },
                ],
              },
            ],
          },
          select: { id: true, name: true, image: true, alt: true, link: true },
        })
      : Promise.resolve([]),
    legalIdSet.size > 0
      ? prisma.legalText.findMany({
          where: { id: { in: [...legalIdSet] }, isActive: true },
          select: { id: true, name: true, content: true },
        })
      : Promise.resolve([]),
  ]);

  return { certifications, banners, legalTexts, countryBranding, isOverridden: false, matchedRules };
}

const DEFAULT_BRANDING: CountryBranding = {
  companyName: "Blackstone Shipping Private Limited",
  website: null,
};

async function resolveCountryBranding(country: string | null): Promise<CountryBranding> {
  if (!country) return DEFAULT_BRANDING;
  const config = await prisma.countryConfig.findUnique({ where: { country } });
  if (!config) return DEFAULT_BRANDING;
  return { companyName: config.companyName, website: config.website };
}
