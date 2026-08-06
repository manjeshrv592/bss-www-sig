import { getActivityLog } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import Link from "next/link";
import { LocaleDatetime } from "@/components/locale-date";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 10;

// Must match the `entity` values passed to logActivity, or a filter silently
// matches nothing.
const entityTypes = [
  { value: "", label: "All" },
  { value: "users", label: "Users" },
  { value: "groups", label: "Groups" },
  { value: "shared_mailbox", label: "Shared Mailboxes" },
  { value: "certification", label: "Certifications" },
  { value: "banner", label: "Banners" },
  { value: "disclaimer", label: "Disclaimers" },
  { value: "registration_line", label: "Registration Lines" },
  { value: "footer_line", label: "Footer Lines" },
  { value: "assignment", label: "Assignments" },
  { value: "user_override", label: "User Overrides" },
];

export default async function ActivityPage(props: {
  searchParams: Promise<{ page?: string; entity?: string; action?: string }>;
}) {
  const searchParams = await props.searchParams;
  const entity = searchParams.entity || undefined;
  const action = searchParams.action || undefined;

  // getActivityLog clamps the page itself, so changing a filter while deep in
  // the pages cannot land on one that no longer exists and render as empty.
  const { items, total, totalPages, page } = await getActivityLog({
    page: Number(searchParams.page) || 1,
    perPage: PER_PAGE,
    entity,
    action,
  });

  // Carried through page links so paging never silently drops a filter.
  const extraParams = [
    entity ? `entity=${encodeURIComponent(entity)}` : "",
    action ? `action=${encodeURIComponent(action)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Track all admin actions across the application
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {entityTypes.map((type) => (
          <Link
            key={type.value}
            // Changing a filter returns to page 1 — the old page number would
            // rarely exist in the new, smaller result set.
            href={type.value ? `/activity?entity=${type.value}` : "/activity"}
          >
            <Button
              variant={entity === type.value || (!entity && !type.value) ? "default" : "outline"}
              size="sm"
            >
              {type.label}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">
            {total} {total === 1 ? "entry" : "entries"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Actions will appear here as admins use the application.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm">{item.action}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.user?.name ?? item.user?.email ?? "Unknown"}</span>
                      <span>·</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {item.entity}
                      </span>
                    </div>
                  </div>
                  <LocaleDatetime date={item.createdAt} className="text-xs text-muted-foreground whitespace-nowrap pt-0.5" />
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/activity"
        extraParams={extraParams}
      />
    </div>
  );
}
