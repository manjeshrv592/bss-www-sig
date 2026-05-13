import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Mail } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { SyncGroupsButton } from "./sync-groups-button";
import { GroupSearch } from "./group-search";
import { LocaleDate } from "@/components/locale-date";

const PER_PAGE = 25;

export default async function GroupsPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q ?? "";
  const page = Number(searchParams.page) || 1;

  const where = query
    ? { displayName: { contains: query, mode: "insensitive" as const } }
    : {};

  const [groups, total, syncMeta] = await Promise.all([
    prisma.msGroup.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { members: true } } },
    }),
    prisma.msGroup.count({ where }),
    prisma.syncMeta.findUnique({ where: { syncType: "groups" } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="text-sm text-muted-foreground">
            {total} groups synced from Microsoft
            {syncMeta?.lastSync && (
              <> · Last sync: <LocaleDate date={syncMeta.lastSync} /></>
            )}
          </p>
        </div>
        <SyncGroupsButton />
      </div>

      <GroupSearch defaultValue={query} />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              {query ? "No groups match your search" : "No groups synced yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {query
                ? "Try a different search term."
                : 'Go to Users page and click "Sync Groups" first.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/groups/${group.id}`}
                        className="font-medium hover:underline"
                      >
                        {group.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {group._count.members}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[300px] truncate">
                      {group.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/groups"
        extraParams={query ? `q=${query}` : ""}
      />
    </div>
  );
}
