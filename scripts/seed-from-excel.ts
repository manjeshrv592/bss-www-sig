/**
 * Seed certifications, legal texts, registration lines and assignment rules
 * from the client's spreadsheet.
 *
 *   npx tsx --env-file=.env scripts/seed-from-excel.ts            # dry run
 *   npx tsx --env-file=.env scripts/seed-from-excel.ts --commit   # write
 *
 * Dry run by default: it prints exactly what it would create and every value it
 * could not resolve, without touching the database. Re-runnable — resources are
 * keyed by name and assignments by their unique scope/resource pair, so running
 * it twice does not duplicate anything.
 *
 * The Certificates column is prose written for a designer rather than data
 * ("REMOVE the AEO logo", "Same strip as Hamburg", "+ CIFFA once member"), so
 * certificates are found by scanning each cell for known names instead of
 * splitting on a delimiter. Instruction clauses are stripped first.
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const COMMIT = process.argv.includes("--commit");
const ROOT = path.resolve(__dirname, "..");
// Deliberately outside public/: these are client business records (VAT and
// registration numbers, internal notes) and are only read at seed time, so they
// never need to be served or deployed.
const XLSX_PATH = path.join(ROOT, "seed", "seed-data.xlsx");
const LOGO_DIR = path.join(ROOT, "seed", "certificates");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ── Certificate name → logo file ───────────────────────────────
// The sheet's wording drifts from the filenames (word order, punctuation,
// qualifiers), so the tricky ones are mapped explicitly.
const ALIASES: Record<string, string> = {
  "sfc (smart freight centre)": "Smart Freight Centre (SFC).jpg",
  "smart freight centre (sfc)": "Smart Freight Centre (SFC).jpg",
  sfc: "Smart Freight Centre (SFC).jpg",
  "clean cargo (ccwg)": "Clean Cargo (CCWG).jpg",
  "clean cargo": "Clean Cargo (CCWG).jpg",
  "blackstone logo only": "Blackstone Logo.jpg",
  "blackstone logo": "Blackstone Logo.jpg",
  "iso 9001:2015": "ISO 90012015.jpg",
  "iso 9001": "ISO 90012015.jpg",
  "citation iso 9001:2015": "Citation ISO 90012015.jpg",
  "aeo (indian customs)": "AEO.jpg",
  aeo: "AEO.jpg",
  "wca risk managed": "WCA Risk Managed.jpg",
  "wcaworld partner pay": "WCAworld Partner Pay.jpg",
  wcaworld: "WCAworld.jpg",
  "global affinity": "Global Affinity.jpg",
  "jctrans premium": "JCTrans Premium.jpg",
  jctrans: "JCTrans Premium.jpg",
  gla: "GLA.jpg",
  iata: "IATA.jpg",
  fmc: "FMC.jpg",
  bifa: "BIFA.jpg",
  rha: "RHA.jpg",
  baffa: "BAFFA.jpg",
  fenex: "FENEX.jpg",
  giff: "GIFF.jpg",
  ciffa: "CIFFA.jpg",
  sla: "SLA.jpg",
  "union tlf": "Union TLF.jpg",
  "forward belgium": "Forward Belgium.jpg",
  "chartered institute of export & international trade":
    "Chartered Institute of Export & International Trade.jpg",
  "parc logo": "PARC Logo.jpg",
};

/** Longest names first so "WCAworld Partner Pay" wins over "WCAworld". */
const SCAN_TERMS = Object.keys(ALIASES).sort((a, b) => b.length - a.length);

const warnings: string[] = [];
const warn = (m: string) => warnings.push(m);

/** Certificates named inside a "REMOVE ..." or "once member" clause. */
function termsIn(text: string): string[] {
  const found: string[] = [];
  let rest = text.toLowerCase();
  for (const term of SCAN_TERMS) {
    if (rest.includes(term)) {
      found.push(ALIASES[term]);
      rest = rest.split(term).join(" ");
    }
  }
  return found;
}

function parseCertificates(cell: string, rowLabel: string): string[] {
  let text = ` ${cell} `;
  const excluded = new Set<string>();

  // "... - REMOVE AEO & ISO logos shown in model 3: Germany is not certified"
  for (const m of text.matchAll(/REMOVE([^+]*)/gi)) {
    termsIn(m[1]).forEach((f) => excluded.add(f));
    text = text.replace(m[0], " ");
  }

  // "(entity in formation; + CIFFA once member)" — pending, not yet applicable.
  for (const m of text.matchAll(/\(([^)]*(?:once member|entity in formation|pending)[^)]*)\)/gi)) {
    termsIn(m[1]).forEach((f) => excluded.add(f));
    text = text.replace(m[0], " ");
  }
  for (const m of text.matchAll(/([A-Za-z &]+)\s+once member/gi)) {
    termsIn(m[1]).forEach((f) => excluded.add(f));
    text = text.replace(m[0], " ");
  }

  // "(no network logos - WCA/JCTrans/GLA allocated to Chennai ... only)"
  for (const m of text.matchAll(/\(no network logos[^)]*\)/gi)) {
    termsIn(m[0]).forEach((f) => excluded.add(f));
    text = text.replace(m[0], " ");
  }

  const included = termsIn(text).filter((f) => !excluded.has(f));
  const missing = included.filter((f) => !fs.existsSync(path.join(LOGO_DIR, f)));
  missing.forEach((f) => warn(`${rowLabel}: logo file not found: ${f}`));

  return [...new Set(included.filter((f) => !missing.includes(f)))];
}

function toDataUri(file: string): string {
  const buf = fs.readFileSync(path.join(LOGO_DIR, file));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const certName = (file: string) => file.replace(/\.jpg$/i, "");

interface Row {
  label: string;
  country: string;
  office: string | null;
  certFiles: string[];
  legal: string;
  registration: string;
  /** Set when the cell defers to another row ("Same strip as Hamburg"). */
  certRef: string | null;
}

function readRows(): Row[] {
  const sheet = XLSX.readFile(XLSX_PATH).Sheets["Sheet1"];
  const raw = XLSX.utils
    .sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false })
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .slice(1);

  const rows: Row[] = [];
  for (const r of raw) {
    const label = String(r[1]).trim();
    if (!label) continue;

    // "Germany - Hamburg" → country "Germany", office "Hamburg".
    // "India - other offices (Bengaluru, …)" is the country-wide baseline.
    const [countryPart, ...officeParts] = label.split(/\s+[-–]\s+/);
    const country = countryPart.trim();
    let office: string | null = officeParts.join(" - ").trim() || null;
    if (office && /^other offices/i.test(office)) office = null;
    if (office) office = office.replace(/\s*\(.*\)\s*$/, "").replace(/\s+Branch$/i, "").trim();

    rows.push({
      label,
      country,
      office,
      certFiles: parseCertificates(String(r[2]), label),
      legal: String(r[3]).trim(),
      registration: String(r[4]).trim(),
      certRef: /Same strip as\s+([A-Za-z ]+?)\s*[(+]/i.exec(String(r[2]))?.[1]?.trim() ?? null,
    });
  }

  // Resolve cross-references such as "Same strip as Hamburg" and "Same legal
  // line as Hamburg". These cells also contain stray ID numbers that partially
  // match certificate names, so the referenced row replaces the parse entirely
  // rather than only filling in when nothing was found.
  const byName = (n: string) =>
    rows.find((o) => o.office?.toLowerCase() === n.toLowerCase()) ??
    rows.find((o) => o.country.toLowerCase() === n.toLowerCase());

  for (const row of rows) {
    if (row.certRef) {
      const src = byName(row.certRef);
      if (src) {
        warn(`${row.label}: certificates say "Same strip as ${row.certRef}" — copied ${src.certFiles.length} from ${src.label}`);
        row.certFiles = [...src.certFiles];
      } else {
        warn(`${row.label}: could not resolve "Same strip as ${row.certRef}"`);
      }
    }
    if (/^Same\b/i.test(row.registration)) {
      const named = /as\s+([A-Za-z ]+?)\s*[(.]/i.exec(row.registration)?.[1]?.trim();
      const src =
        (named && byName(named)) ??
        rows.find((o) => o !== row && o.country === row.country && !/^Same\b/i.test(o.registration));
      if (src) {
        warn(`${row.label}: registration line says "${row.registration}" — copied from ${src.label}`);
        row.registration = src.registration;
      }
    }
  }

  // If every office in a country ends up identical, collapse to one country
  // rule — otherwise a user with no Office set in their profile matches nothing.
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

  for (const country of new Set(rows.map((r) => r.country))) {
    const group = rows.filter((r) => r.country === country);
    if (group.length < 2 || group.some((r) => !r.office)) continue;
    const [first, ...rest] = group;
    const identical = rest.every(
      (r) =>
        sameSet(r.certFiles, first.certFiles) &&
        r.legal === first.legal &&
        r.registration === first.registration
    );
    if (identical) {
      warn(`${country}: all ${group.length} offices are identical — collapsed to a single country rule`);
      first.office = null;
      for (const r of rest) rows.splice(rows.indexOf(r), 1);
    }
  }

  return rows;
}

async function main() {
  console.log(COMMIT ? "MODE: COMMIT (writing)\n" : "MODE: DRY RUN (nothing written)\n");
  const rows = readRows();

  // A country-level rule applies to every office in that country, so an office
  // rule only needs to carry what that office adds on top of the baseline.
  const baseline = new Map<string, Row>();
  for (const r of rows) if (!r.office) baseline.set(r.country, r);
  for (const r of rows) {
    if (r.office) continue;
    // Single-office countries have no separate baseline row; they are the baseline.
  }
  for (const c of new Set(rows.map((r) => r.country))) {
    if (!baseline.has(c)) {
      const only = rows.filter((r) => r.country === c);
      if (only.length === 1) baseline.set(c, only[0]);
    }
  }

  const plan: { scope: string; value: string | null; type: string; key: string }[] = [];
  const certFiles = new Set<string>();
  const legalTexts = new Map<string, string[]>();
  const regLines = new Map<string, string[]>();

  for (const r of rows) {
    const base = baseline.get(r.country);
    const isBaseline = base === r;
    const scope = isBaseline ? "country" : "office";
    const value = isBaseline ? r.country : r.office;
    if (!isBaseline && !r.office) continue;

    // Only the delta for office rows — the country rule already contributes the rest.
    const certs = isBaseline
      ? r.certFiles
      : r.certFiles.filter((f) => !base || !base.certFiles.includes(f));

    certs.forEach((f) => {
      certFiles.add(f);
      plan.push({ scope, value, type: "certification", key: certName(f) });
    });

    if (r.legal && (isBaseline || r.legal !== base?.legal)) {
      if (!legalTexts.has(r.legal)) legalTexts.set(r.legal, []);
      legalTexts.get(r.legal)!.push(r.label);
      plan.push({ scope, value, type: "legal_text", key: r.legal });
    }
    if (r.registration && (isBaseline || r.registration !== base?.registration)) {
      if (!regLines.has(r.registration)) regLines.set(r.registration, []);
      regLines.get(r.registration)!.push(r.label);
      plan.push({ scope, value, type: "registration_line", key: r.registration });
    }
  }

  // ── Report ───────────────────────────────────────────────
  console.log(`Rows: ${rows.length}`);
  for (const r of rows) {
    const isBase = baseline.get(r.country) === r;
    console.log(
      `  ${isBase ? "country" : "office "} ${(isBase ? r.country : r.office) ?? "?"}`.padEnd(34) +
        `certs:${r.certFiles.length}  ${r.label}`
    );
  }
  console.log(`\nDistinct certifications : ${certFiles.size}`);
  console.log(`Distinct legal texts    : ${legalTexts.size}`);
  console.log(`Distinct registration   : ${regLines.size}`);
  console.log(`Assignment rules        : ${plan.length}`);

  // Countries/offices in the sheet that no synced user actually matches.
  const users = await prisma.msUser.findMany({
    select: { country: true, officeLocation: true },
  });
  const haveCountries = new Set(users.map((u) => u.country).filter(Boolean));
  const haveOffices = new Set(users.map((u) => u.officeLocation).filter(Boolean));
  const missCountry = [...new Set(rows.map((r) => r.country))].filter((c) => !haveCountries.has(c));
  const missOffice = [...new Set(rows.map((r) => r.office).filter(Boolean))].filter(
    (o) => !haveOffices.has(o as string)
  );

  console.log(`\nSynced users: ${users.length}`);
  if (missCountry.length)
    console.log(`  countries with no matching user: ${missCountry.join(", ")}`);
  if (missOffice.length)
    console.log(`  offices with no matching user  : ${missOffice.join(", ")}`);
  console.log("  (rules are still created; they simply match nobody until users are synced)");

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.log("  ! " + w));
  }

  if (!COMMIT) {
    console.log("\nDry run complete. Re-run with --commit to write.");
    return;
  }

  // ── Write ────────────────────────────────────────────────
  const certIds = new Map<string, string>();
  let order = 0;
  for (const file of [...certFiles].sort()) {
    const name = certName(file);
    const existing = await prisma.certification.findFirst({ where: { name } });
    const data = { name, alt: name, image: toDataUri(file), sortOrder: order++ };
    const rec = existing
      ? await prisma.certification.update({ where: { id: existing.id }, data })
      : await prisma.certification.create({ data });
    certIds.set(name, rec.id);
  }
  console.log(`\ncertifications: ${certIds.size}`);

  const legalIds = new Map<string, string>();
  for (const [content, labels] of legalTexts) {
    const name = `${labels[0]}${labels.length > 1 ? ` +${labels.length - 1} more` : ""}`;
    const existing = await prisma.legalText.findFirst({ where: { content } });
    const rec = existing
      ? await prisma.legalText.update({ where: { id: existing.id }, data: { name } })
      : await prisma.legalText.create({ data: { name, content } });
    legalIds.set(content, rec.id);
  }
  console.log(`legal texts   : ${legalIds.size}`);

  const regIds = new Map<string, string>();
  for (const [text, labels] of regLines) {
    const name = labels[0];
    const existing = await prisma.registrationLine.findFirst({ where: { text } });
    const rec = existing
      ? await prisma.registrationLine.update({ where: { id: existing.id }, data: { name } })
      : await prisma.registrationLine.create({ data: { name, text } });
    regIds.set(text, rec.id);
  }
  console.log(`registration  : ${regIds.size}`);

  let created = 0;
  for (const p of plan) {
    const resourceId =
      p.type === "certification"
        ? certIds.get(p.key)
        : p.type === "legal_text"
          ? legalIds.get(p.key)
          : regIds.get(p.key);
    if (!resourceId) continue;

    const existing = await prisma.assignment.findFirst({
      where: { scope: p.scope, scopeValue: p.value, resourceType: p.type, resourceId },
    });
    if (!existing) {
      await prisma.assignment.create({
        data: { scope: p.scope, scopeValue: p.value, resourceType: p.type, resourceId },
      });
      created++;
    }
  }
  console.log(`assignments   : ${created} created (${plan.length - created} already present)`);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
