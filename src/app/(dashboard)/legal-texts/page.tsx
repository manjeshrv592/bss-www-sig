import { prisma } from "@/lib/prisma";
import { LegalTextList } from "./legal-text-list";

export default async function LegalTextsPage() {
  // Not paginated: the list is drag-sortable, and dragging a row onto another
  // page isn't possible.
  const legalTexts = await prisma.legalText.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const total = legalTexts.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Legal Texts</h1>
        <p className="text-sm text-muted-foreground">
          {total} legal text{total !== 1 ? "s" : ""} total · drag to set the
          order they appear in signatures
        </p>
      </div>

      <LegalTextList legalTexts={legalTexts} />
    </div>
  );
}
