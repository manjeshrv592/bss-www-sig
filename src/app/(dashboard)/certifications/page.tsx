import { prisma } from "@/lib/prisma";
import { CertificationList } from "./certification-list";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 10;

export default async function CertificationsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;

  const [certifications, total] = await Promise.all([
    prisma.certification.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.certification.count(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
        <p className="text-sm text-muted-foreground">
          {total} certification{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <CertificationList certifications={certifications} />
      <Pagination page={page} totalPages={totalPages} basePath="/certifications" />
    </div>
  );
}
