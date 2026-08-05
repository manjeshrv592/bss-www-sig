import { prisma } from "@/lib/prisma";

export interface CountryBranding {
  companyName: string;
  website: string | null;
}

export interface ResolvedSignature {
  certifications: { id: string; name: string; image: string | null; alt: string | null }[];
  banners: { id: string; name: string; image: string | null; alt: string | null; link: string | null }[];
  legalTexts: { id: string; name: string; content: string }[];
  registrationLine: { id: string; name: string; text: string } | null;
  footerLine: { id: string; name: string; leftText: string; rightText: string } | null;
  countryBranding: CountryBranding;
  isOverridden: boolean;
  matchedRules: { scope: string; scopeValue: string | null }[];
}

/**
 * How specific a scope is. Certifications, banners and legal texts are lists,
 * so every matching rule contributes (OR + dedupe). The registration and footer
 * lines are single slots in the template, so stacking them would render broken
 * output — for those, the most specific matching rule wins instead.
 */
const SCOPE_SPECIFICITY: Record<string, number> = {
  global: 0,
  country: 1,
  state: 2,
  office: 3,
  job_title: 4,
  group: 5,
};

/**
 * Pick the winning assignment for a single-slot resource: highest specificity,
 * then the most recently created rule as a deterministic tie-break (e.g. a user
 * in two groups that each assign a footer).
 */
function pickMostSpecific(
  assignments: { scope: string; resourceId: string; createdAt: Date }[]
) {
  let best: { scope: string; resourceId: string; createdAt: Date } | null = null;

  for (const a of assignments) {
    if (!best) {
      best = a;
      continue;
    }
    const rank = SCOPE_SPECIFICITY[a.scope] ?? -1;
    const bestRank = SCOPE_SPECIFICITY[best.scope] ?? -1;
    if (rank > bestRank || (rank === bestRank && a.createdAt > best.createdAt)) {
      best = a;
    }
  }

  return best?.resourceId ?? null;
}

export async function resolveSignature(msUserId: string): Promise<ResolvedSignature> {
  // Fetch user with overrides AND country config in parallel
  const [user, groupMemberships] = await Promise.all([
    prisma.msUser.findUnique({
      where: { id: msUserId },
      include: { overrides: true },
    }),
    prisma.msGroupMember.findMany({
      where: { msUserId: msUserId },
      select: { group: { select: { id: true } } },
    }),
  ]);

  if (!user) {
    return {
      certifications: [],
      banners: [],
      legalTexts: [],
      registrationLine: null,
      footerLine: null,
      countryBranding: DEFAULT_BRANDING,
      isOverridden: false,
      matchedRules: [],
    };
  }

  // Resolve country branding (can run in parallel with override check)
  const countryBrandingPromise = resolveCountryBranding(user.country);

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
    // Single-slot resources: an override can only name one of each.
    const registrationId = user.overrides.find(
      (o) => o.resourceType === "registration_line"
    )?.resourceId;
    const footerId = user.overrides.find(
      (o) => o.resourceType === "footer_line"
    )?.resourceId;

    const [certifications, banners, legalTexts, registrationLine, footerLine] = await Promise.all([
      prisma.certification.findMany({
        where: { id: { in: certIds }, isActive: true },
        select: { id: true, name: true, image: true, alt: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.banner.findMany({
        where: { id: { in: bannerIds }, isActive: true },
        select: { id: true, name: true, image: true, alt: true, link: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.legalText.findMany({
        where: { id: { in: legalIds }, isActive: true },
        select: { id: true, name: true, content: true },
        orderBy: { sortOrder: "asc" },
      }),
      registrationId
        ? prisma.registrationLine.findFirst({
            where: { id: registrationId, isActive: true },
            select: { id: true, name: true, text: true },
          })
        : Promise.resolve(null),
      footerId
        ? prisma.footerLine.findFirst({
            where: { id: footerId, isActive: true },
            select: { id: true, name: true, leftText: true, rightText: true },
          })
        : Promise.resolve(null),
    ]);

    const countryBranding = await countryBrandingPromise;
    return {
      certifications,
      banners,
      legalTexts,
      registrationLine,
      footerLine,
      countryBranding,
      isOverridden: true,
      matchedRules: [],
    };
  }

  // Build scope conditions for this user (OR logic)
  const scopeConditions: { scope: string; scopeValue: string | null }[] = [
    { scope: "global", scopeValue: null },
  ];

  if (user.country) {
    scopeConditions.push({ scope: "country", scopeValue: user.country });
  }
  if (user.state) {
    scopeConditions.push({ scope: "state", scopeValue: user.state });
  }
  if (user.officeLocation) {
    scopeConditions.push({ scope: "office", scopeValue: user.officeLocation });
  }
  if (user.jobTitle) {
    scopeConditions.push({ scope: "job_title", scopeValue: user.jobTitle });
  }

  // Add group scopes — use already fetched group memberships
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
  // Single-slot resources are collected rather than deduped, so the most
  // specific matching rule can be chosen below.
  const registrationCandidates: typeof assignments = [];
  const footerCandidates: typeof assignments = [];
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
    else if (a.resourceType === "registration_line") registrationCandidates.push(a);
    else if (a.resourceType === "footer_line") footerCandidates.push(a);
  }

  const registrationId = pickMostSpecific(registrationCandidates);
  const footerId = pickMostSpecific(footerCandidates);

  const [certifications, banners, legalTexts, registrationLine, footerLine] = await Promise.all([
    certIdSet.size > 0
      ? prisma.certification.findMany({
          where: { id: { in: [...certIdSet] }, isActive: true },
          select: { id: true, name: true, image: true, alt: true },
          orderBy: { sortOrder: "asc" },
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
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
    legalIdSet.size > 0
      ? prisma.legalText.findMany({
          where: { id: { in: [...legalIdSet] }, isActive: true },
          select: { id: true, name: true, content: true },
          orderBy: { sortOrder: "asc" },
        })
      : Promise.resolve([]),
    registrationId
      ? prisma.registrationLine.findFirst({
          where: { id: registrationId, isActive: true },
          select: { id: true, name: true, text: true },
        })
      : Promise.resolve(null),
    footerId
      ? prisma.footerLine.findFirst({
          where: { id: footerId, isActive: true },
          select: { id: true, name: true, leftText: true, rightText: true },
        })
      : Promise.resolve(null),
  ]);

  const countryBranding = await countryBrandingPromise;
  return {
    certifications,
    banners,
    legalTexts,
    registrationLine,
    footerLine,
    countryBranding,
    isOverridden: false,
    matchedRules,
  };
}

const DEFAULT_BRANDING: CountryBranding = {
  companyName: "Blackstone Shipping Private Limited",
  website: "https://blackstoneshipping.com",
};

async function resolveCountryBranding(country: string | null): Promise<CountryBranding> {
  if (!country) return DEFAULT_BRANDING;
  const config = await prisma.countryConfig.findUnique({ where: { country } });
  if (!config) return DEFAULT_BRANDING;
  return {
    companyName: config.companyName,
    website: config.website ?? DEFAULT_BRANDING.website,
  };
}
