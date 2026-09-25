import { prisma } from "@/lib/prisma";
import { DisclaimerList } from "./disclaimer-list";
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
          { content: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  // `total` is every row; `matched` is what the search leaves. Paging follows
  // the matches, while positions and the header stay relative to the full list.
  const total = await prisma.disclaimer.count();
  const matched = query ? await prisma.disclaimer.count({ where }) : total;
  const totalPages = Math.max(1, Math.ceil(matched / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  // Ordered by sortOrder so the position shown is the position in the signature.
  const rows = await prisma.disclaimer.findMany({
    where,
    orderBy: ORDER_BY,
    skip: offset,
    take: PER_PAGE,
  });

  // While searching, a row's position is still its place in the full ordering,
  // which a filtered page can't tell on its own — look it up from all ids.
  const positions = query
    ? Object.fromEntries(
        (await prisma.disclaimer.findMany({ select: { id: true }, orderBy: ORDER_BY })).map(
          (r, i) => [r.id, i]
        )
      )
    : undefined;

  // Rules and overrides reference resources by loose id, so a resource in use
  // must not be deletable. Counted here so the list can say what is blocking
  // the delete at click time, rather than after the undo window expires.
  const usage = await getResourceUsage(
    "disclaimer",
    rows.map((r) => r.id)
  );
  // Passed as the full breakdown, not just a total: the blocked-delete dialog
  // reports rules and overrides separately.
  const inUse = Object.fromEntries(usage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disclaimers</h1>
        <p className="text-sm text-muted-foreground">
          {query
            ? `${matched} of ${total} disclaimer${total !== 1 ? "s" : ""} match “${query}” · clear the search to reorder`
            : `${total} disclaimer${total !== 1 ? "s" : ""} total · drag to reorder within the page, or type a position to move one anywhere`}
        </p>
      </div>

      <ListSearch defaultValue={query} placeholder="Search disclaimers by name or text..." />

      <DisclaimerList disclaimers={rows} inUse={inUse} offset={offset} total={total} positions={positions} query={query} />
      <Pagination page={page} totalPages={totalPages} total={matched} perPage={PER_PAGE} extraParams={query ? `q=${encodeURIComponent(query)}` : ""} basePath="/disclaimers" />
    </div>
  );
}
