import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search } from "lucide-react";
import { SyncButton } from "./sync-button";
import { UserSearch } from "./user-search";

export default async function UsersPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q ?? "";
  const page = Number(searchParams.page) || 1;
  const perPage = 25;

  const where = query
    ? {
        OR: [
          { displayName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
          { department: { contains: query, mode: "insensitive" as const } },
          { jobTitle: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total, syncMeta] = await Promise.all([
    prisma.msUser.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.msUser.count({ where }),
    prisma.syncMeta.findUnique({ where: { syncType: "users" } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {total} users synced from Microsoft
            {syncMeta?.lastSync && (
              <> · Last sync: {new Date(syncMeta.lastSync).toLocaleString()}</>
            )}
          </p>
        </div>
        <SyncButton lastStatus={syncMeta?.status ?? "idle"} />
      </div>

      <UserSearch defaultValue={query} />

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              {query ? "No users match your search" : "No users synced yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {query
                ? "Try a different search term."
                : 'Click "Sync Users" to fetch users from Microsoft Graph.'}
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
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium hover:underline"
                      >
                        {user.displayName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.jobTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.department ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.country ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/users?page=${page - 1}${query ? `&q=${query}` : ""}`}>
                <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/users?page=${page + 1}${query ? `&q=${query}` : ""}`}>
                <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                  Next
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
