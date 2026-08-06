/**
 * Apply seed/seed-plan.json to the database.
 *
 *   npx tsx --env-file=.env scripts/seed.ts            # dry run
 *   npx tsx --env-file=.env scripts/seed.ts --commit   # write
 *
 * Reads plain JSON and the logo files, so it needs no spreadsheet parser and
 * runs anywhere the app runs. Regenerate the plan with build-seed-plan.ts after
 * the client updates the sheet.
 *
 * Idempotent: resources are matched by name and assignments by their scope /
 * resource pair, so re-running updates rather than duplicates.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const COMMIT = process.argv.includes("--commit");
const ROOT = path.resolve(__dirname, "..");
const PLAN_PATH = path.join(ROOT, "seed", "seed-plan.json");
const LOGO_DIR = path.join(ROOT, "seed", "certificates");

interface Plan {
  generatedAt: string;
  rows: { label: string; scope: string; scopeValue: string | null; certificateCount: number }[];
  certifications: { name: string; file: string }[];
  disclaimers: { name: string; content: string }[];
  registrationLines: { name: string; text: string }[];
  assignments: {
    scope: string;
    scopeValue: string | null;
    resourceType: string;
    resourceName: string;
  }[];
  warnings: string[];
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!fs.existsSync(PLAN_PATH)) {
    throw new Error(`Missing ${path.relative(ROOT, PLAN_PATH)} — run: npx tsx scripts/build-seed-plan.ts`);
  }
  const plan: Plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));

  console.log(COMMIT ? "MODE: COMMIT (writing)\n" : "MODE: DRY RUN (nothing written)\n");
  console.log(`Plan generated ${plan.generatedAt}`);
  for (const r of plan.rows) {
    console.log(
      `  ${r.scope.padEnd(7)} ${String(r.scopeValue ?? "?").padEnd(16)} certs:${String(r.certificateCount).padStart(2)}  ${r.label}`
    );
  }
  console.log(`\ncertifications : ${plan.certifications.length}`);
  console.log(`legal texts    : ${plan.disclaimers.length}`);
  console.log(`registration   : ${plan.registrationLines.length}`);
  console.log(`assignments    : ${plan.assignments.length}`);

  const missingLogos = plan.certifications.filter(
    (c) => !fs.existsSync(path.join(LOGO_DIR, c.file))
  );
  if (missingLogos.length) {
    throw new Error(`Missing logo files: ${missingLogos.map((c) => c.file).join(", ")}`);
  }

  // Rules for a country or office nobody is in are valid but inert.
  const users = await prisma.msUser.findMany({ select: { country: true, officeLocation: true } });
  const haveCountry = new Set(users.map((u) => u.country).filter(Boolean));
  const haveOffice = new Set(users.map((u) => u.officeLocation).filter(Boolean));
  const inert = plan.rows.filter((r) =>
    r.scope === "country" ? !haveCountry.has(r.scopeValue) : !haveOffice.has(r.scopeValue)
  );
  console.log(`\nsynced users   : ${users.length}`);
  if (inert.length) {
    console.log(`  ${inert.length} rule group(s) match no current user:`);
    console.log(`    ${inert.map((r) => `${r.scope}:${r.scopeValue}`).join(", ")}`);
    console.log("  (created anyway; they apply once matching users are synced)");
  }

  if (plan.warnings.length) {
    console.log(`\nplan warnings (${plan.warnings.length}):`);
    plan.warnings.forEach((w) => console.log("  ! " + w));
  }

  if (!COMMIT) {
    console.log("\nDry run complete. Re-run with --commit to write.");
    return;
  }

  const certIds = new Map<string, string>();
  let order = 0;
  for (const c of plan.certifications) {
    const image = `data:image/jpeg;base64,${fs.readFileSync(path.join(LOGO_DIR, c.file)).toString("base64")}`;
    const data = { name: c.name, alt: c.name, image, sortOrder: order++ };
    const existing = await prisma.certification.findFirst({ where: { name: c.name } });
    const rec = existing
      ? await prisma.certification.update({ where: { id: existing.id }, data })
      : await prisma.certification.create({ data });
    certIds.set(c.name, rec.id);
  }

  const disclaimerIds = new Map<string, string>();
  for (const l of plan.disclaimers) {
    const existing = await prisma.disclaimer.findFirst({ where: { name: l.name } });
    const rec = existing
      ? await prisma.disclaimer.update({ where: { id: existing.id }, data: { content: l.content } })
      : await prisma.disclaimer.create({ data: { name: l.name, content: l.content } });
    disclaimerIds.set(l.name, rec.id);
  }

  const regIds = new Map<string, string>();
  for (const r of plan.registrationLines) {
    const existing = await prisma.registrationLine.findFirst({ where: { name: r.name } });
    const rec = existing
      ? await prisma.registrationLine.update({ where: { id: existing.id }, data: { text: r.text } })
      : await prisma.registrationLine.create({ data: { name: r.name, text: r.text } });
    regIds.set(r.name, rec.id);
  }

  const idFor = (type: string, name: string) =>
    type === "certification"
      ? certIds.get(name)
      : type === "disclaimer"
        ? disclaimerIds.get(name)
        : regIds.get(name);

  let created = 0;
  for (const a of plan.assignments) {
    const resourceId = idFor(a.resourceType, a.resourceName);
    if (!resourceId) {
      console.warn(`  ! no resource for ${a.resourceType} "${a.resourceName}"`);
      continue;
    }
    const existing = await prisma.assignment.findFirst({
      where: {
        scope: a.scope,
        scopeValue: a.scopeValue,
        resourceType: a.resourceType,
        resourceId,
      },
    });
    if (!existing) {
      await prisma.assignment.create({
        data: {
          scope: a.scope,
          scopeValue: a.scopeValue,
          resourceType: a.resourceType,
          resourceId,
        },
      });
      created++;
    }
  }

  console.log(`\nwrote certifications:${certIds.size} legal:${disclaimerIds.size} registration:${regIds.size}`);
  console.log(`assignments: ${created} created, ${plan.assignments.length - created} already present`);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
