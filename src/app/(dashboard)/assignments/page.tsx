import { prisma } from "@/lib/prisma";
import { AssignmentManager } from "./assignment-manager";

export default async function AssignmentsPage() {
  const [
    assignments,
    certifications,
    banners,
    disclaimers,
    registrationLines,
    footerLines,
    countries,
    states,
    offices,
    jobTitles,
    groups,
  ] = await Promise.all([
      prisma.assignment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.certification.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.banner.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.disclaimer.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.registrationLine.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.footerLine.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.msUser.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" },
      }),
      prisma.msUser.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ["state"],
        orderBy: { state: "asc" },
      }),
      prisma.msUser.findMany({
        where: { officeLocation: { not: null } },
        select: { officeLocation: true },
        distinct: ["officeLocation"],
        orderBy: { officeLocation: "asc" },
      }),
      prisma.jobTitle.findMany({
        select: { title: true },
        orderBy: { title: "asc" },
      }),
      prisma.msGroup.findMany({
        select: { id: true, displayName: true },
        orderBy: { displayName: "asc" },
      }),
    ]);

  const countryList = countries
    .map((c) => c.country)
    .filter((c): c is string => c !== null);
  const stateList = states
    .map((s) => s.state)
    .filter((s): s is string => s !== null);
  const officeList = offices
    .map((o) => o.officeLocation)
    .filter((o): o is string => o !== null);
  const jobTitleList = jobTitles.map((j) => j.title);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Assign resources to users by scope. Rules use OR logic with deduplication.
        </p>
      </div>

      <AssignmentManager
        assignments={assignments}
        certifications={certifications}
        banners={banners}
        disclaimers={disclaimers}
        registrationLines={registrationLines}
        footerLines={footerLines}
        countries={countryList}
        states={stateList}
        offices={officeList}
        jobTitles={jobTitleList}
        groups={groups}
      />
    </div>
  );
}
