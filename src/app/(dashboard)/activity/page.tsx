import { getActivityLog } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { LocaleDatetime } from "@/components/locale-date";

export default async function ActivityPage(props: {
  searchParams: Promise<{ page?: string; entity?: string; action?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const entity = searchParams.entity || undefined;
  const action = searchParams.action || undefined;

  const { items, total, totalPages } = await getActivityLog({
    page,
    perPage: 20,
    entity,
    action,
  });

  const entityTypes = [
    { value: "", label: "All" },
    { value: "system", label: "System" },
    { value: "users", label: "Users" },
    { value: "certification", label: "Certifications" },
    { value: "banner", label: "Banners" },
    { value: "disclaimer", label: "Disclaimers" },
    { value: "assignment", label: "Assignments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Track all admin actions across the application
        </p>
      </div>

      <div className="flex items-center gap-2">
        {entityTypes.map((type) => (
          <Link
            key={type.value}
            href={
              type.value
                ? `/activity?entity=${type.value}`
                : "/activity"
            }
          >
            <Button
              variant={entity === type.value || (!entity && !type.value) ? "default" : "outline"}
              size="sm"
              className="text-xs"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/activity?page=${page - 1}${entity ? `&entity=${entity}` : ""}`}
                  >
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <ChevronLeft className="h-3 w-3" />
                      Previous
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/activity?page=${page + 1}${entity ? `&entity=${entity}` : ""}`}
                  >
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
