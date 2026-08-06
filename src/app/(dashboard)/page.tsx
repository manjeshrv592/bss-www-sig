import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, RefreshCw, ArrowRight, Activity, Link2, Info } from "lucide-react";
import { LocaleDate, LocaleDatetime } from "@/components/locale-date";
import { CountUp } from "@/components/count-up";
import {
  CategoryBarChart,
  ActivityAreaChart,
  CoverageMeters,
} from "./dashboard-charts";

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  country: "Country",
  state: "State / Province",
  office: "Office",
  job_title: "Job Title",
  group: "Group",
};

/**
 * The 14 day-buckets for the activity chart, oldest first and aligned to local
 * midnight — a rolling "now minus 14 days" would make the oldest bucket a part
 * day and understate it.
 */
function activityWindow() {
  const days: Date[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default async function DashboardPage() {
  const session = await auth();
  const days = activityWindow();

  const [
    syncMeta,
    recentActivity,
    userCount,
    certCount,
    bannerCount,
    disclaimerCount,
    registrationCount,
    footerCount,
    assignmentCount,
    groupCount,
    countryRows,
    scopeRows,
    coverage,
    activityRows,
  ] = await Promise.all([
    prisma.syncMeta.findUnique({ where: { syncType: "users" } }),
    getRecentActivity(5),
    prisma.msUser.count(),
    prisma.certification.count(),
    prisma.banner.count(),
    prisma.disclaimer.count(),
    prisma.registrationLine.count(),
    prisma.footerLine.count(),
    prisma.assignment.count(),
    prisma.msGroup.count(),
    prisma.msUser.groupBy({
      by: ["country"],
      _count: { _all: true },
      where: { country: { not: null } },
    }),
    prisma.assignment.groupBy({ by: ["scope"], _count: { _all: true } }),
    // Which location fields are actually filled in — assignment rules match on
    // these exact values, so a blank one means the user matches nothing.
    prisma.msUser.aggregate({
      _count: { country: true, state: true, officeLocation: true, jobTitle: true },
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: days[0] } },
      select: { createdAt: true },
    }),
  ]);

  const resourceCount =
    certCount + bannerCount + disclaimerCount + registrationCount + footerCount;
  const lastSync = syncMeta?.lastSync ?? null;

  const usersByCountry = countryRows
    .map((r) => ({ name: r.country ?? "—", value: r._count._all }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const assignmentsByScope = scopeRows
    .map((r) => ({ name: SCOPE_LABELS[r.scope] ?? r.scope, value: r._count._all }))
    .sort((a, b) => b.value - a.value);

  // Empty days still appear, so a gap in the trend reads as "nothing happened".
  const activityByDay = days.map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return {
      date: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: activityRows.filter((r) => r.createdAt >= d && r.createdAt < next).length,
    };
  });

  const coverageRows = [
    { label: "Country", filled: coverage._count.country },
    { label: "State / Province", filled: coverage._count.state },
    { label: "Office", filled: coverage._count.officeLocation },
    { label: "Job Title", filled: coverage._count.jobTitle },
  ];
  const weakestCoverage = Math.min(...coverageRows.map((r) => r.filled));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "Admin"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold"><CountUp value={userCount} /></p>
            <p className="text-xs text-muted-foreground">{groupCount} groups synced</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold"><CountUp value={resourceCount} /></p>
            <p className="text-xs text-muted-foreground">
              {certCount} certs · {bannerCount} banners · {disclaimerCount} disclaimers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assignment Rules</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold"><CountUp value={assignmentCount} /></p>
            <p className="text-xs text-muted-foreground">
              across {assignmentsByScope.length} scope
              {assignmentsByScope.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{lastSync ? <LocaleDate date={lastSync} /> : "Never"}</p>
            <p className="text-xs text-muted-foreground">Microsoft Graph sync</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Profile Coverage</CardTitle>
            <CardDescription>
              How many of the {userCount} synced users have each field filled in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverageMeters rows={coverageRows} total={userCount} />
            {userCount > 0 && weakestCoverage < userCount && (
              <p className="flex gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Rules match these values exactly. A user with a blank field
                  matches no rule for that scope and falls back to global.
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Users by Country</CardTitle>
            <CardDescription>
              {usersByCountry.length === 0
                ? "No country set on any user yet"
                : "Top countries by number of synced users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={usersByCountry}
              valueLabel="Users"
              label="No country set on any user yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Rules by Scope</CardTitle>
            <CardDescription>Where assignment rules are targeted</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              data={assignmentsByScope}
              valueLabel="Rules"
              label="No assignment rules yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Activity</CardTitle>
            <CardDescription>Admin actions over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityAreaChart data={activityByDay} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <CardDescription>Latest actions performed by admins</CardDescription>
          </div>
          <Link href="/activity">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      by {activity.user?.name ?? activity.user?.email ?? "System"}
                    </p>
                  </div>
                  <LocaleDatetime date={activity.createdAt} className="text-xs text-muted-foreground whitespace-nowrap" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
