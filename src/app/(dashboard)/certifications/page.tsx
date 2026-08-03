import { prisma } from "@/lib/prisma";
import { CertificationList } from "./certification-list";

export default async function CertificationsPage() {
  // Not paginated: the list is drag-sortable, and dragging a row onto another
  // page isn't possible. A signature strip only holds a handful of badges.
  const certifications = await prisma.certification.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const total = certifications.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
        <p className="text-sm text-muted-foreground">
          {total} certification{total !== 1 ? "s" : ""} total · drag to set the
          order they appear in signatures
        </p>
      </div>

      <CertificationList certifications={certifications} />
    </div>
  );
}
