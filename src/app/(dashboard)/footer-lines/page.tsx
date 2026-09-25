import { prisma } from "@/lib/prisma";
import { FooterLineList } from "./footer-line-list";
import { Pagination } from "@/components/pagination";
import { ListSearch } from "@/components/list-search";
import { getResourceUsage } from "@/lib/resource-usage";

const PER_PAGE = 10;

export default async function Page(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await props.searchParams;
  const query = q?.trim() ?? "";
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { leftText: { contains: query, mode: "insensitive" as const } },
          { rightText: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  // `total` is every row; `matched` is what the search leaves. Paging follows
  // the matches, while positions and the header stay relative to the full list.
  const total = await prisma.footerLine.count();
  const matched = query ? await prisma.footerLine.count({ where }) : total;
  const totalPages = Math.max(1, Math.ceil(matched / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  const lines = await prisma.footerLine.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: PER_PAGE,
  });

  // Rules and overrides reference resources by loose id, so a resource in use
  // must not be deletable. Counted here so the list can say what is blocking
  // the delete at click time, rather than after the undo window expires.
  const usage = await getResourceUsage(
    "footer_line",
    lines.map((r) => r.id)
  );
  // Passed as the full breakdown, not just a total: the blocked-delete dialog
  // reports rules and overrides separately.
  const inUse = Object.fromEntries(usage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Footer Lines</h1>
        <p className="text-sm text-muted-foreground">
          The bottom row of the signature — left and right cells. Assign one per
          scope; the most specific rule wins. Unassigned users keep the default
          &ldquo;14 Countries - 25 Offices&rdquo; and the country website.
        </p>
      </div>

      <ListSearch defaultValue={query} placeholder="Search footer lines by name or text..." />

      <FooterLineList lines={lines} inUse={inUse} query={query} />
      <Pagination page={page} totalPages={totalPages} total={matched} perPage={PER_PAGE} extraParams={query ? `q=${encodeURIComponent(query)}` : ""} basePath="/footer-lines" />
    </div>
  );
}
