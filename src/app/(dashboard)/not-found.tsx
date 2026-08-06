import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchX } from "lucide-react";

/**
 * Handles notFound() from the dashboard routes — a user or group id that no
 * longer exists, usually after a re-sync. Without this, those calls fall
 * through to the root 404, which renders outside the app shell and strands the
 * user with no navigation.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <SearchX className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Not found</p>
            <p className="text-sm text-muted-foreground">
              This record doesn&apos;t exist. It may have been deleted, or
              removed by a Microsoft sync.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/users">
              <Button variant="outline">Users</Button>
            </Link>
            <Link href="/">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
