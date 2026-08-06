import { prisma } from "@/lib/prisma";
import { CertificationList } from "./certification-list";
import { Pagination } from "@/components/pagination";
import { getResourceUsage } from "@/lib/resource-usage";

const PER_PAGE = 10;

export default async function Page(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await props.searchParams;
  const total = await prisma.certification.count();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(Number(pageParam) || 1, 1), totalPages);
  const offset = (page - 1) * PER_PAGE;

  // Ordered by sortOrder so the position shown is the position in the signature.
  const rows = await prisma.certification.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    skip: offset,
    take: PER_PAGE,
  });

  // Rules and overrides reference resources by loose id, so a resource in use
  // must not be deletable. Counted here so the list can say what is blocking
  // the delete at click time, rather than after the undo window expires.
  const usage = await getResourceUsage(
    "certification",
    rows.map((r) => r.id)
  );
  // Passed as the full breakdown, not just a total: the blocked-delete dialog
  // reports rules and overrides separately.
  const inUse = Object.fromEntries(usage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
        <p className="text-sm text-muted-foreground">
          {total} certification{total !== 1 ? "s" : ""} total · drag to reorder within
          the page, or type a position to move one anywhere
        </p>
      </div>

      <CertificationList certifications={rows} inUse={inUse} offset={offset} total={total} />
      <Pagination page={page} totalPages={totalPages} basePath="/certifications" />
    </div>
  );
}
