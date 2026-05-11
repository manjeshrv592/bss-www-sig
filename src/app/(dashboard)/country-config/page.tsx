import { prisma } from "@/lib/prisma";
import { CountryConfigManager } from "./country-config-manager";

export default async function CountryConfigPage() {
  const [configs, countries] = await Promise.all([
    prisma.countryConfig.findMany({ orderBy: { country: "asc" } }),
    prisma.msUser.findMany({
      where: { country: { not: null } },
      select: { country: true },
      distinct: ["country"],
      orderBy: { country: "asc" },
    }),
  ]);

  const countryList = countries
    .map((c) => c.country)
    .filter((c): c is string => c !== null);

  // Filter out countries that already have a config
  const configuredCountries = new Set(configs.map((c) => c.country));
  const availableCountries = countryList.filter((c) => !configuredCountries.has(c));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Country Config</h1>
        <p className="text-sm text-muted-foreground">
          Map countries to company names and websites. Fallback: Blackstone Shipping Private Limited.
        </p>
      </div>

      <CountryConfigManager
        configs={configs}
        availableCountries={availableCountries}
      />
    </div>
  );
}
