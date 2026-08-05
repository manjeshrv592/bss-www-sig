import { prisma } from "@/lib/prisma";
import { FooterLineList } from "./footer-line-list";

export default async function FooterLinesPage() {
  const lines = await prisma.footerLine.findMany({
    orderBy: { createdAt: "desc" },
  });

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

      <FooterLineList lines={lines} />
    </div>
  );
}
