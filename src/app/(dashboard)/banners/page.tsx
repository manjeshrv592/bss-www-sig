import { prisma } from "@/lib/prisma";
import { BannerList } from "./banner-list";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 10;

export default async function BannersPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;

  const [banners, total] = await Promise.all([
    prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.banner.count(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">
          {total} banner{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <BannerList banners={banners} />
      <Pagination page={page} totalPages={totalPages} basePath="/banners" />
    </div>
  );
}
