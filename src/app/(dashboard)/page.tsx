import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, RefreshCw, ArrowRight, Activity } from "lucide-react";
import { LocaleDate, LocaleDatetime } from "@/components/locale-date";

export default async function DashboardPage() {
  const session = await auth();

  const [syncMeta, recentActivity, userCount, certCount, bannerCount, legalCount] =
    await Promise.all([
      prisma.syncMeta.findUnique({ where: { syncType: "users" } }),
      getRecentActivity(5),
      prisma.msUser.count(),
      prisma.certification.count(),
      prisma.banner.count(),
      prisma.legalText.count(),
    ]);

  const resourceCount = certCount + bannerCount + legalCount;

  const lastSync = syncMeta?.lastSync ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "Admin"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount}</p>
            <p className="text-xs text-muted-foreground">Synced from Microsoft</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resourceCount}</p>
            <p className="text-xs text-muted-foreground">{certCount} certs, {bannerCount} banners, {legalCount} legal</p>
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
