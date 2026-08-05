/**
 * Parse the client spreadsheet into seed/seed-plan.json.
 *
 *   npx tsx scripts/build-seed-plan.ts
 *
 * Development-only: this is the half that needs `xlsx`, a devDependency. The
 * generated plan is committed, so seeding a server needs neither the
 * spreadsheet nor the parser — see scripts/seed.ts.
 *
 * Keeping the parse out of the deploy also means production applies exactly the
 * plan that was reviewed, and the JSON diff shows what a sheet edit changed.
 *
 * The Certificates column is prose written for a designer rather than data
 * ("REMOVE the AEO logo", "Same strip as Hamburg", "+ CIFFA once member"), so
 * certificates are found by scanning each cell for known names instead of
 * splitting on a delimiter, with instruction clauses stripped first.
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const ROOT = path.resolve(__dirname, "..");
const XLSX_PATH = path.join(ROOT, "seed", "seed-data.xlsx");
const LOGO_DIR = path.join(ROOT, "seed", "certificates");
const OUT_PATH = path.join(ROOT, "seed", "seed-plan.json");

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

interface Row {
  label: string;
  country: string;
  office: string | null;
  certFiles: string[];
  legal: string;
  registration: string;
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

    // "Germany - Hamburg" -> country "Germany", office "Hamburg".
    // "India - other offices (…)" is the country-wide baseline.
    const [countryPart, ...officeParts] = label.split(/\s+[-–]\s+/);
    let office: string | null = officeParts.join(" - ").trim() || null;
    if (office && /^other offices/i.test(office)) office = null;
    if (office) office = office.replace(/\s*\(.*\)\s*$/, "").replace(/\s+Branch$/i, "").trim();

    rows.push({
      label,
      country: countryPart.trim(),
      office,
      certFiles: parseCertificates(String(r[2]), label),
      legal: String(r[3]).trim(),
      registration: String(r[4]).trim(),
      certRef: /Same strip as\s+([A-Za-z ]+?)\s*[(+]/i.exec(String(r[2]))?.[1]?.trim() ?? null,
    });
  }

  // Resolve cross-references. These cells also contain stray ID numbers that
  // partially match certificate names, so the referenced row replaces the
  // parse entirely rather than only filling in when nothing was found.
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

function main() {
  const rows = readRows();

  // A country rule applies to every office in that country, so an office rule
  // only needs to carry what that office adds on top of the baseline.
  const baseline = new Map<string, Row>();
  for (const r of rows) if (!r.office) baseline.set(r.country, r);
  for (const c of new Set(rows.map((r) => r.country))) {
    if (!baseline.has(c)) {
      const only = rows.filter((r) => r.country === c);
      if (only.length === 1) baseline.set(c, only[0]);
    }
  }

  const certifications = new Map<string, string>(); // name -> file
  const legalTexts = new Map<string, string[]>(); // content -> labels
  const registrationLines = new Map<string, string[]>(); // text -> labels
  const assignments: {
    scope: string;
    scopeValue: string | null;
    resourceType: string;
    resourceName: string;
  }[] = [];

  for (const r of rows) {
    const base = baseline.get(r.country);
    const isBaseline = base === r;
    if (!isBaseline && !r.office) continue;
    const scope = isBaseline ? "country" : "office";
    const scopeValue = isBaseline ? r.country : r.office;

    const certs = isBaseline
      ? r.certFiles
      : r.certFiles.filter((f) => !base || !base.certFiles.includes(f));

    for (const file of certs) {
      const name = file.replace(/\.jpg$/i, "");
      certifications.set(name, file);
      assignments.push({ scope, scopeValue, resourceType: "certification", resourceName: name });
    }
    if (r.legal && (isBaseline || r.legal !== base?.legal)) {
      if (!legalTexts.has(r.legal)) legalTexts.set(r.legal, []);
      legalTexts.get(r.legal)!.push(r.label);
    }
    if (r.registration && (isBaseline || r.registration !== base?.registration)) {
      if (!registrationLines.has(r.registration)) registrationLines.set(r.registration, []);
      registrationLines.get(r.registration)!.push(r.label);
    }
  }

  const legalList = [...legalTexts].map(([content, labels]) => ({
    name: `${labels[0]}${labels.length > 1 ? ` +${labels.length - 1} more` : ""}`,
    content,
    labels,
  }));
  const regList = [...registrationLines].map(([text, labels]) => ({
    name: labels[0],
    text,
    labels,
  }));

  // Second pass now that names exist.
  for (const r of rows) {
    const base = baseline.get(r.country);
    const isBaseline = base === r;
    if (!isBaseline && !r.office) continue;
    const scope = isBaseline ? "country" : "office";
    const scopeValue = isBaseline ? r.country : r.office;

    if (r.legal && (isBaseline || r.legal !== base?.legal)) {
      const lt = legalList.find((l) => l.content === r.legal)!;
      assignments.push({ scope, scopeValue, resourceType: "legal_text", resourceName: lt.name });
    }
    if (r.registration && (isBaseline || r.registration !== base?.registration)) {
      const rl = regList.find((l) => l.text === r.registration)!;
      assignments.push({ scope, scopeValue, resourceType: "registration_line", resourceName: rl.name });
    }
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    source: "seed/seed-data.xlsx",
    rows: rows.map((r) => ({
      label: r.label,
      scope: baseline.get(r.country) === r ? "country" : "office",
      scopeValue: baseline.get(r.country) === r ? r.country : r.office,
      certificateCount: r.certFiles.length,
    })),
    certifications: [...certifications]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, file]) => ({ name, file })),
    legalTexts: legalList.map(({ name, content }) => ({ name, content })),
    registrationLines: regList.map(({ name, text }) => ({ name, text })),
    assignments,
    warnings,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(plan, null, 2) + "\n");

  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  rows               : ${plan.rows.length}`);
  console.log(`  certifications     : ${plan.certifications.length}`);
  console.log(`  legal texts        : ${plan.legalTexts.length}`);
  console.log(`  registration lines : ${plan.registrationLines.length}`);
  console.log(`  assignments        : ${plan.assignments.length}`);
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.log("  ! " + w));
  }
}

main();
