import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Building, MapPin, Phone, Briefcase, Globe, Info, Shield } from "lucide-react";
import { resolveSignature } from "@/lib/signature-resolver";
import { generateSignatureHtml } from "@/lib/signature-template";
import { UserOverrideManager } from "./user-override";
import { SignaturePreview } from "./signature-preview";

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  country: "Country",
  state: "State / Province",
  office: "Office",
  job_title: "Job Title",
  group: "Group",
};

export default async function UserProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // One round trip: nothing here depends on another query's result, so the
  // overrides and group names are fetched alongside rather than after.
  const [
    user,
    signature,
    allCerts,
    allBanners,
    allDisclaimers,
    allRegistration,
    allFooter,
    overrides,
    groupsMap,
  ] = await Promise.all([
    prisma.msUser.findUnique({ where: { id } }),
    resolveSignature(id),
    prisma.certification.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.banner.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.disclaimer.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.registrationLine.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.footerLine.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.userOverride.findMany({ where: { msUserId: id } }),
    prisma.msGroup.findMany({ select: { id: true, displayName: true } }),
  ]);
  if (!user) notFound();

  const groupNameMap = new Map(groupsMap.map((g) => [g.id, g.displayName]));

  // Prefer first name + last name. The Microsoft displayName often includes a
  // company suffix (e.g. "Nikhil - Blackstone Shipping"), so use it only as a fallback.
  const fullName =
    [user.givenName, user.surname].filter(Boolean).join(" ") || user.displayName || "—";

  const initials =
    [user.givenName, user.surname]
      .filter(Boolean)
      .map((n) => n![0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "?";

  const details = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Briefcase, label: "Job Title", value: user.jobTitle },
    { icon: Building, label: "Department", value: user.department },
    { icon: Building, label: "Company", value: user.companyName },
    { icon: MapPin, label: "Office", value: user.officeLocation },
    { icon: MapPin, label: "City", value: user.city },
    { icon: MapPin, label: "State / Province", value: user.state },
    { icon: MapPin, label: "Country", value: user.country },
    { icon: Phone, label: "Mobile", value: user.mobilePhone },
    {
      icon: Phone,
      label: "Business Phone",
      value: user.businessPhones?.join(", ") || null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">User Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{fullName}</h2>
            {user.isSharedMailbox && (
              <Link
                href="/shared-mailboxes"
                className="mt-1 rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-500/20"
              >
                Shared Mailbox
              </Link>
            )}
            <p className="text-sm text-muted-foreground">{user.jobTitle ?? "No title"}</p>
            <p className="text-xs text-muted-foreground mt-1">{user.department ?? ""}</p>
            <div className="mt-4 w-full space-y-2 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    user.accountEnabled
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {user.accountEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">UPN</span>
                <span className="truncate ml-2 text-right font-mono text-[10px]">
                  {user.userPrincipalName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {details.map(
                (item) =>
                  item.value && (
                    <div key={item.label} className="flex items-start gap-3">
                      <item.icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="text-sm">{item.value}</dd>
                      </div>
                    </div>
                  )
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">Signature Preview</CardTitle>
              {signature.isOverridden && (
                <span className="rounded-full bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-[10px] font-medium">
                  Customized
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border bg-white p-4">
              <SignaturePreview
                html={generateSignatureHtml(
                  user,
                  signature.certifications,
                  signature.banners,
                  signature.disclaimers,
                  {
                    defaultCompanyName: signature.countryBranding.companyName,
                    website: signature.countryBranding.website ?? undefined,
                    registrationText: signature.registrationLine?.text,
                    footerLeft: signature.footerLine?.leftText,
                    footerRight: signature.footerLine?.rightText,
                  },
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              Why this signature?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signature.isOverridden ? (
              <p className="text-sm text-muted-foreground">
                This user has a <strong className="text-yellow-500">custom override</strong>. Rule-based assignments are ignored.
              </p>
            ) : signature.matchedRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assignment rules match this user. The signature is empty.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Resources assigned via these rules (OR + dedup):</p>
                <div className="flex flex-wrap gap-2">
                  {signature.matchedRules.map((r) => (
                    <span
                      key={`${r.scope}:${r.scopeValue}`}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
                    >
                      <Globe className="h-3 w-3" />
                      {r.scope === "global"
                        ? "Global"
                        : r.scope === "group"
                          ? `Group: ${groupNameMap.get(r.scopeValue ?? "") ?? r.scopeValue}`
                          : `${SCOPE_LABELS[r.scope] ?? r.scope}: ${r.scopeValue}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-2 pt-2">
              <div>
                <p className="text-xs font-medium mb-1">
                  Registration Line
                  {signature.registrationLine && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      — {signature.registrationLine.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {signature.registrationLine?.text ?? "None"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">
                  Footer Line
                  {signature.footerLine && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      — {signature.footerLine.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {signature.footerLine
                    ? `${signature.footerLine.leftText}  ·  ${signature.footerLine.rightText}`
                    : "Default (14 Countries - 25 Offices · country website)"}
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3 pt-2">
              <div>
                <p className="text-xs font-medium mb-1">Certifications ({signature.certifications.length})</p>
                {signature.certifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-0.5">
                    {signature.certifications.map((c) => (
                      <li key={c.id} className="text-xs text-muted-foreground">• {c.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Banners ({signature.banners.length})</p>
                {signature.banners.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-0.5">
                    {signature.banners.map((b) => (
                      <li key={b.id} className="text-xs text-muted-foreground">• {b.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Disclaimers ({signature.disclaimers.length})</p>
                {signature.disclaimers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-0.5">
                    {signature.disclaimers.map((l) => (
                      <li key={l.id} className="text-xs text-muted-foreground">• {l.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              User Override
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserOverrideManager
              msUserId={id}
              isOverridden={signature.isOverridden}
              currentOverrides={overrides.map((o) => ({ resourceType: o.resourceType, resourceId: o.resourceId }))}
              certifications={allCerts}
              banners={allBanners}
              disclaimers={allDisclaimers}
              registrationLines={allRegistration}
              footerLines={allFooter}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

