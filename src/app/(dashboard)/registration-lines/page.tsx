import { prisma } from "@/lib/prisma";
import { RegistrationLineList } from "./registration-line-list";

export default async function RegistrationLinesPage() {
  const lines = await prisma.registrationLine.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registration Lines</h1>
        <p className="text-sm text-muted-foreground">
          A single line shown directly under the disclaimer, in the same style.
          Assign one per scope — the most specific rule wins.
        </p>
      </div>

      <RegistrationLineList lines={lines} />
    </div>
  );
}
