import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AssignmentManager } from "./assignment-manager";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

/**
 * Optionally narrowed to one resource, which is how the resource lists link
 * here when something can't be deleted because it is still assigned.
 */
export default async function AssignmentsPage(props: {
  searchParams: Promise<{ resourceType?: string; resourceId?: string }>;
}) {
  const { resourceType, resourceId } = await props.searchParams;
  const filtering = Boolean(resourceType && resourceId);
  const filter = filtering ? { resourceType, resourceId } : {};

  // Only to label the filter banner; the lists below already carry the names.
  const filteredName = filtering
    ? (
        await (resourceType === "certification"
          ? prisma.certification.findUnique({ where: { id: resourceId! }, select: { name: true } })
          : resourceType === "banner"
            ? prisma.banner.findUnique({ where: { id: resourceId! }, select: { name: true } })
            : resourceType === "disclaimer"
              ? prisma.disclaimer.findUnique({ where: { id: resourceId! }, select: { name: true } })
              : resourceType === "registration_line"
                ? prisma.registrationLine.findUnique({ where: { id: resourceId! }, select: { name: true } })
                : prisma.footerLine.findUnique({ where: { id: resourceId! }, select: { name: true } }))
      )?.name ?? "this resource"
    : null;
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
      prisma.assignment.findMany({ where: filter, orderBy: { createdAt: "desc" } }),
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

      {filtering && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2.5 shadow-soft-sm">
          <span className="flex items-center gap-2 text-sm">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            Showing only rules that use{" "}
            <span className="font-medium">{filteredName}</span>
            <span className="text-muted-foreground">
              ({assignments.length} rule{assignments.length === 1 ? "" : "s"})
            </span>
          </span>
          <Link href="/assignments">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <X className="h-3 w-3" />
              Show all
            </Button>
          </Link>
        </div>
      )}

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
