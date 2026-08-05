import { prisma } from "@/lib/prisma";
import { AssignmentManager } from "./assignment-manager";

export default async function AssignmentsPage() {
  const [
    assignments,
    certifications,
    banners,
    legalTexts,
    registrationLines,
    footerLines,
    countries,
    states,
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
      prisma.legalText.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.registrationLine.findMany({
        where: { isActive: true },
        select: { id: true, text: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.footerLine.findMany({
        where: { isActive: true },
        select: { id: true, leftText: true, rightText: true },
        orderBy: { createdAt: "asc" },
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
        legalTexts={legalTexts}
        registrationLines={registrationLines.map((r) => ({
          id: r.id,
          name: r.text.length > 60 ? `${r.text.slice(0, 60)}…` : r.text,
        }))}
        footerLines={footerLines.map((f) => ({
          id: f.id,
          name: `${f.leftText}  ·  ${f.rightText}`,
        }))}
        countries={countryList}
        states={stateList}
        jobTitles={jobTitleList}
        groups={groups}
      />
    </div>
  );
}
