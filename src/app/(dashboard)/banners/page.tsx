import { prisma } from "@/lib/prisma";
import { BannerList } from "./banner-list";

export default async function BannersPage() {
  // Not paginated: the list is drag-sortable, and dragging a row onto another
  // page isn't possible.
  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const total = banners.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">
          {total} banner{total !== 1 ? "s" : ""} total · drag to set the order
          they appear in signatures
        </p>
      </div>

      <BannerList banners={banners} />
    </div>
  );
}
