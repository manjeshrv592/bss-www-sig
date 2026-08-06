import { prisma } from "@/lib/prisma";
import { FooterLineList } from "./footer-line-list";
import { Pagination } from "@/components/pagination";
import { getResourceUsage } from "@/lib/resource-usage";

const PER_PAGE = 10;

export default async function Page(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await props.searchParams;
  const total = await prisma.footerLine.count();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  const lines = await prisma.footerLine.findMany({
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

      <FooterLineList lines={lines} inUse={inUse} />
      <Pagination page={page} totalPages={totalPages} basePath="/footer-lines" />
    </div>
  );
}
