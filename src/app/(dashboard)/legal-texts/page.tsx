import { prisma } from "@/lib/prisma";
import { LegalTextList } from "./legal-text-list";
import { Pagination } from "@/components/pagination";

const PER_PAGE = 10;

export default async function LegalTextsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;

  const [legalTexts, total] = await Promise.all([
    prisma.legalText.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.legalText.count(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Legal Texts</h1>
        <p className="text-sm text-muted-foreground">
          {total} legal text{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <LegalTextList legalTexts={legalTexts} />
      <Pagination page={page} totalPages={totalPages} basePath="/legal-texts" />
    </div>
  );
}
