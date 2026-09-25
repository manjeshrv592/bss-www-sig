import { prisma } from "@/lib/prisma";
import { BannerList } from "./banner-list";
import { Pagination } from "@/components/pagination";
import { ListSearch } from "@/components/list-search";
import { getResourceUsage } from "@/lib/resource-usage";

const PER_PAGE = 10;
const ORDER_BY = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export default async function Page(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await props.searchParams;
  const query = q?.trim() ?? "";
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { alt: { contains: query, mode: "insensitive" as const } },
          { link: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  // `total` is every row; `matched` is what the search leaves. Paging follows
  // the matches, while positions and the header stay relative to the full list.
  const total = await prisma.banner.count();
  const matched = query ? await prisma.banner.count({ where }) : total;
  const totalPages = Math.max(1, Math.ceil(matched / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  // Ordered by sortOrder so the position shown is the position in the signature.
  const rows = await prisma.banner.findMany({
    where,
    orderBy: ORDER_BY,
    skip: offset,
    take: PER_PAGE,
  });

  // While searching, a row's position is still its place in the full ordering,
  // which a filtered page can't tell on its own — look it up from all ids.
  const positions = query
    ? Object.fromEntries(
        (await prisma.banner.findMany({ select: { id: true }, orderBy: ORDER_BY })).map(
          (r, i) => [r.id, i]
        )
      )
    : undefined;

  // Rules and overrides reference resources by loose id, so a resource in use
  // must not be deletable. Counted here so the list can say what is blocking
  // the delete at click time, rather than after the undo window expires.
  const usage = await getResourceUsage(
    "banner",
    rows.map((r) => r.id)
  );
  // Passed as the full breakdown, not just a total: the blocked-delete dialog
  // reports rules and overrides separately.
  const inUse = Object.fromEntries(usage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
        <p className="text-sm text-muted-foreground">
          {query
            ? `${matched} of ${total} banner${total !== 1 ? "s" : ""} match “${query}” · clear the search to reorder`
            : `${total} banner${total !== 1 ? "s" : ""} total · drag to reorder within the page, or type a position to move one anywhere`}
        </p>
      </div>

      <ListSearch defaultValue={query} placeholder="Search banners by name, alt text or link..." />

      <BannerList banners={rows} inUse={inUse} offset={offset} total={total} positions={positions} query={query} />
      <Pagination page={page} totalPages={totalPages} total={matched} perPage={PER_PAGE} extraParams={query ? `q=${encodeURIComponent(query)}` : ""} basePath="/banners" />
    </div>
  );
}
