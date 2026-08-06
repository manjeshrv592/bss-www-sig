import { prisma } from "@/lib/prisma";
import { BannerList } from "./banner-list";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 10;

export default async function Page(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await props.searchParams;
  const total = await prisma.banner.count();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  // Ordered by sortOrder so the position shown is the position in the signature.
  const rows = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    skip: offset,
    take: PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">
          {total} banner{total !== 1 ? "s" : ""} total · drag to reorder within
          the page, or type a position to move one anywhere
        </p>
      </div>

      <BannerList banners={rows} offset={offset} total={total} />
      <Pagination page={page} totalPages={totalPages} basePath="/banners" />
    </div>
  );
}
