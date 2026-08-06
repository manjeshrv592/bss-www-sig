import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Shield, Mail, Link2, Award, Image, FileText } from "lucide-react";

const RESOURCE_LABELS: Record<string, string> = {
  certification: "Certification",
  banner: "Banner",
  disclaimer: "Disclaimer",
};

const RESOURCE_ICONS: Record<string, typeof Award> = {
  certification: Award,
  banner: Image,
  disclaimer: FileText,
};

export default async function GroupDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [group, members, assignments] = await Promise.all([
    prisma.msGroup.findUnique({ where: { id } }),
    prisma.msGroupMember.findMany({
      where: { groupId: id },
      include: {
        msUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            jobTitle: true,
            department: true,
            country: true,
          },
        },
      },
      orderBy: { msUser: { displayName: "asc" } },
    }),
    prisma.assignment.findMany({
      where: { scope: "group", scopeValue: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!group) notFound();

  // Resolve resource names for assignments
  const certIds = assignments.filter((a) => a.resourceType === "certification").map((a) => a.resourceId);
  const bannerIds = assignments.filter((a) => a.resourceType === "banner").map((a) => a.resourceId);
  const disclaimerIds = assignments.filter((a) => a.resourceType === "disclaimer").map((a) => a.resourceId);

  const [certs, banners, disclaimers] = await Promise.all([
    certIds.length > 0 ? prisma.certification.findMany({ where: { id: { in: certIds } }, select: { id: true, name: true } }) : [],
    bannerIds.length > 0 ? prisma.banner.findMany({ where: { id: { in: bannerIds } }, select: { id: true, name: true } }) : [],
    disclaimerIds.length > 0 ? prisma.disclaimer.findMany({ where: { id: { in: disclaimerIds } }, select: { id: true, name: true } }) : [],
  ]);

  const resourceNameMap = new Map<string, string>();
  for (const r of [...certs, ...banners, ...disclaimers]) resourceNameMap.set(r.id, r.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/groups">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{group.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {group.description ?? "No description"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Group Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Group Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium">{members.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <div className="flex items-center gap-1.5">
                {group.securityEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[10px] font-medium">
                    <Shield className="h-2.5 w-2.5" />
                    Security
                  </span>
                )}
                {group.mailEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-500 px-2 py-0.5 text-[10px] font-medium">
                    <Mail className="h-2.5 w-2.5" />
                    Mail
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assignments</span>
              <span className="font-medium">{assignments.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">MS ID</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate ml-2 max-w-[160px]">{group.msId}</span>
            </div>
          </CardContent>
        </Card>

        {/* Assignments for this group */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Assigned Resources
            </CardTitle>
            <Link href="/assignments">
              <Button variant="outline" size="sm" className="text-xs">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resources assigned to this group. Go to Assignments to add some.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => {
                  const Icon = RESOURCE_ICONS[a.resourceType] ?? Award;
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {resourceNameMap.get(a.resourceId) ?? a.resourceId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {RESOURCE_LABELS[a.resourceType] ?? a.resourceType}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No members in this group.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${m.msUser.id}`}
                        className="font-medium hover:underline"
                      >
                        {m.msUser.displayName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.msUser.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.msUser.jobTitle ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.msUser.department ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.msUser.country ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
