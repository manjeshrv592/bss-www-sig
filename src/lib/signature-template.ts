/**
 * Email Signature Template Generator
 * Generates HTML email signature with user data, certifications, banners, and legal text
 * Adapted from the Blackstone Shipping signature project
 */

interface SignatureUser {
  givenName: string | null;
  surname: string | null;
  displayName: string | null;
  jobTitle: string | null;
  mobilePhone: string | null;
  businessPhones: string[];
  officeLocation: string | null;
  city: string | null;
  country: string | null;
  companyName: string | null;
}

interface SignatureCertification {
  name: string;
  image: string | null;
  alt: string | null;
}

interface SignatureBanner {
  image: string | null;
  alt: string | null;
  link: string | null;
}

interface SignatureLegalText {
  content: string;
}

interface SignatureOptions {
  logoUrl?: string;
  website?: string;
  tagline?: string;
  defaultCompanyName?: string;
}

const DEFAULT_OPTIONS: SignatureOptions = {
  logoUrl: "/blackstone-logo.png",
  website: "https://www.blackstoneshipping.com",
  tagline: "14 Countries - 25 Offices",
  defaultCompanyName: "Blackstone Shipping Private Limited",
};

export function generateSignatureHtml(
  user: SignatureUser,
  certifications: SignatureCertification[] = [],
  banners: SignatureBanner[] = [],
  legalTexts: SignatureLegalText[] = [],
  opts: SignatureOptions = {}
): string {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  const fullName = user.displayName
    ?? ([user.givenName, user.surname].filter(Boolean).join(" ") || "");
  const designation = user.jobTitle ?? "";
  const contactNumber = user.mobilePhone ?? "";
  const telephoneNumber = user.businessPhones?.[0] ?? "";
  const companyName = user.companyName || options.defaultCompanyName || "";
  const website = options.website || "";

  // Build multi-line address
  const addressLine1Parts: string[] = [];
  if (user.officeLocation) addressLine1Parts.push(user.officeLocation);

  const addressLine2Parts: string[] = [];
  if (user.city) addressLine2Parts.push(user.city);

  const addressLine3Parts: string[] = [];
  if (user.country) addressLine3Parts.push(user.country);

  const hasAddress =
    addressLine1Parts.length > 0 ||
    addressLine2Parts.length > 0 ||
    addressLine3Parts.length > 0;

  // Generate certification images HTML (all side by side in one row)
  let certificationsHtml = "";
  const activeCerts = certifications.filter((c) => c.image);
  if (activeCerts.length > 0) {
    const cells = activeCerts
      .map(
        (cert, i) => `
      <td style="${i < activeCerts.length - 1 ? "padding-right: 14px;" : ""}">
        <img src="${cert.image}" alt="${cert.alt ?? cert.name}" style="height: 54px; width: auto; display: block;" />
      </td>`
      )
      .join("");
    certificationsHtml = `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; margin-left: auto;">
      <tr>
        ${cells}
      </tr>
    </table>`;
  }

  // Generate banner images HTML
  const bannersHtml = banners
    .filter((b) => b.image)
    .map((banner) => {
      const img = `<img src="${banner.image}" alt="${banner.alt ?? "Banner"}" style="max-width: 600px; width: 100%; height: auto; display: block;" />`;
      const wrapped = banner.link
        ? `<a href="${banner.link}" target="_blank" style="text-decoration: none;">${img}</a>`
        : img;
      return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; max-width: 600px; width: 100%;">
      <tr>
        <td>
          ${wrapped}
        </td>
      </tr>
    </table>`;
    })
    .join("");

  // Convert Tiptap HTML for email compatibility (strip any leftover classes)
  function sanitizeHtmlForEmail(html: string): string {
    return html.replace(/class\s*=\s*"[^"]*"/g, "");
  }

  // Generate legal text HTML
  let legalTextHtml = "";
  if (legalTexts.length > 0) {
    const ltContent = legalTexts
      .map(
        (lt) => `
      <div style="font-size: 14px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word;">
        ${sanitizeHtmlForEmail(lt.content)}
      </div>`
      )
      .join("");
    legalTextHtml = `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; width: 600px; table-layout: fixed;">
      <tr>
        <td>
          ${ltContent}
        </td>
      </tr>
    </table>`;
  }

  // Build address HTML for right column
  let addressHtml = "";
  if (hasAddress) {
    const lines: string[] = [];
    if (addressLine1Parts.length > 0) lines.push(addressLine1Parts.join(", "));
    if (addressLine2Parts.length > 0) lines.push(addressLine2Parts.join(", "));
    if (addressLine3Parts.length > 0) lines.push(addressLine3Parts.join(", "));
    addressHtml = lines
      .map(
        (line) =>
          `<span style="display: block; text-align: right;">${line}</span>`
      )
      .join("");
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>html, body { overflow: hidden; }</style>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div id="bss-signature">
  <table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937; width: 600px;">
    <tr>
      <!-- Left Column: Name, Designation, Mobile -->
      <td style="vertical-align: top; padding-right: 30px; min-width: 250px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <!-- Name -->
          <tr>
            <td style="padding-bottom: 2px;">
              <span style="font-size: 22px; font-weight: 700; color: #111827; display: block;">${fullName}</span>
            </td>
          </tr>

          <!-- Designation -->
          <tr>
            <td style="padding-bottom: 14px;">
              <span style="font-size: 14px; color: #4b5563; display: block;">${designation}</span>
            </td>
          </tr>

          ${contactNumber ? `
          <!-- Mobile Number -->
          <tr>
            <td style="padding-bottom: 6px;">
              <a href="tel:${contactNumber.replace(/[^0-9+]/g, "")}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;">M. ${contactNumber}</a>
            </td>
          </tr>
          ` : ""}
        </table>
      </td>

      <!-- Right Column: Logo, Company Name, Address, Telephone -->
      <td style="vertical-align: top; text-align: right;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-left: auto;">
          ${options.logoUrl ? `
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 10px; text-align: right;">
              <img src="${options.logoUrl}" alt="${companyName}" style="height: 70px; width: auto; display: inline-block;" />
            </td>
          </tr>
          ` : ""}

          <!-- Company Name -->
          <tr>
            <td style="padding-bottom: 4px; text-align: right;">
              <span style="font-size: 14px; font-weight: 700; color: #2563eb; display: block; text-align: right;">${companyName}</span>
            </td>
          </tr>

          ${hasAddress ? `
          <!-- Address -->
          <tr>
            <td style="padding-bottom: 4px; text-align: right;">
              <span style="font-size: 13px; color: #1f2937; line-height: 1.5;">
                ${addressHtml}
              </span>
            </td>
          </tr>
          ` : ""}

          ${telephoneNumber ? `
          <!-- Telephone -->
          <tr>
            <td style="text-align: right; padding-top: 4px;">
              <a href="tel:${telephoneNumber.replace(/[^0-9+]/g, "")}" style="color: #2563eb; text-decoration: none; font-size: 14px;">T. ${telephoneNumber}</a>
            </td>
          </tr>
          ` : ""}
        </table>
      </td>
    </tr>
  </table>

  <!-- Certifications (constrained to signature width) -->
  <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
    <tr>
      <td style="text-align: right;">
        ${certificationsHtml}
      </td>
    </tr>
  </table>
  ${bannersHtml}
  ${legalTextHtml}

  <!-- Footer -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; max-width: 600px; width: 100%;">
    <tr>
      <td style="font-size: 14px; color: #2563eb; font-weight: 600;">
        ${options.tagline ?? ""}
      </td>
      ${website ? `
      <td style="font-size: 14px; text-align: right;">
        <a href="${website}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">${website.replace(/^https?:\/\//, "")}</a>
      </td>
      ` : ""}
    </tr>
  </table>
  </div>
</body>
</html>`.trim();
}
