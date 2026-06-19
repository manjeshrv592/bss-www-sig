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
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
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

  // Prefer first name + last name. The Microsoft displayName often includes a
  // company suffix (e.g. "Nikhil - Blackstone Shipping"), so only use it as a
  // fallback when givenName/surname aren't available.
  const fullName =
    [user.givenName, user.surname].filter(Boolean).join(" ")
    || user.displayName
    || "";
  const designation = user.jobTitle ?? "";
  const contactNumber = user.mobilePhone ?? "";
  const telephoneNumber = user.businessPhones?.[0] ?? "";
  const companyName = user.companyName || options.defaultCompanyName || "";
  const website = options.website || "";

  // Build multi-line address: street / city, state postalCode / country
  const addressLines: string[] = [];
  if (user.streetAddress) addressLines.push(user.streetAddress);

  const cityLine = [
    [user.city, user.state].filter(Boolean).join(", "),
    user.postalCode,
  ]
    .filter(Boolean)
    .join(" ");
  if (cityLine) addressLines.push(cityLine);

  if (user.country) addressLines.push(user.country);

  const hasAddress = addressLines.length > 0;

  // Generate certification images HTML (all side by side in one row)
  let certificationsHtml = "";
  const activeCerts = certifications.filter((c) => c.image);
  if (activeCerts.length > 0) {
    const cells = activeCerts
      .map(
        (cert, i) => `
      <td style="${i < activeCerts.length - 1 ? "padding-right: 14px;" : ""}">
        <img src="${cert.image}" alt="${cert.alt ?? cert.name}" height="70" style="height: 70px; width: auto; display: block;" />
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
      const img = `<img src="${banner.image}" alt="${banner.alt ?? "Banner"}" width="500" style="width: 500px; height: auto; display: block;" />`;
      const wrapped = banner.link
        ? `<a href="${banner.link}" target="_blank" style="text-decoration: none;">${img}</a>`
        : img;
      return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 15px; max-width: 500px; width: 100%;">
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
      <div style="font-size: 14px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; text-align: justify;">
        ${sanitizeHtmlForEmail(lt.content)}
      </div>`
      )
      .join("");
    legalTextHtml = `
    <table cellpadding="0" cellspacing="0" border="0" width="500" style="width: 500px; table-layout: fixed;">
      <tr>
        <td height="15" style="font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;">&nbsp;</td>
      </tr>
      <tr>
        <td>
          ${ltContent}
        </td>
      </tr>
    </table>`;
  }

  // Build address HTML for right column
  // Use <br> instead of display:block spans — classic Outlook (Word renderer) ignores display:block on spans
  let addressHtml = "";
  if (hasAddress) {
    addressHtml = addressLines.join("<br>");
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
  <table cellpadding="0" cellspacing="0" border="0" width="500" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937; width: 500px;">
    <tr>
      <!-- Left Column: Name, Designation, Mobile -->
      <td style="vertical-align: top; padding-right: 30px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <!-- Name -->
          <tr>
            <td style="padding-bottom: 2px;">
              <span style="font-size: 16px; font-weight: 700; color: #111827; display: block; white-space: nowrap;">${fullName}</span>
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
              <a href="tel:${contactNumber.replace(/[^0-9+]/g, "")}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;"><span style="color: #2563eb; font-size: 14px; font-weight: 600;">M. ${contactNumber}</span></a>
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
              <img src="${options.logoUrl}" alt="${companyName}" height="70" style="height: 70px; width: auto; display: inline-block;" />
            </td>
          </tr>
          ` : ""}

          ${companyName ? `
          <!-- Company Name (right column, below logo) -->
          <tr>
            <td style="padding-bottom: 10px; text-align: right;">
              <a href="${website}" target="_blank" style="font-size: 14px; font-weight: 700; color: #2563eb; text-decoration: none; display: block; white-space: nowrap;">${companyName}</a>
            </td>
          </tr>
          ` : ""}

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
              <a href="tel:${telephoneNumber.replace(/[^0-9+]/g, "")}" style="color: #2563eb; text-decoration: none; font-size: 14px;"><span style="color: #2563eb; font-size: 14px;">T. ${telephoneNumber}</span></a>
            </td>
          </tr>
          ` : ""}
        </table>
      </td>
    </tr>
  </table>

  <!-- Certifications (constrained to signature width) -->
  <table cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
    <tr>
      <td style="text-align: right;">
        ${certificationsHtml}
      </td>
    </tr>
  </table>
  ${bannersHtml}
  ${legalTextHtml}

  <!-- Footer: width attribute + align attribute used for classic Outlook (Word renderer ignores width:100% CSS) -->
  <table cellpadding="0" cellspacing="0" border="0" width="500" style="margin-top: 15px; width: 500px;">
    <tr>
      <td style="font-size: 14px; color: #2563eb; font-weight: 600; white-space: nowrap;">
        ${options.tagline ?? ""}
      </td>
      ${website ? `
      <td align="right" style="font-size: 14px; text-align: right; white-space: nowrap;">
        <a href="${website}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">${website.replace(/^https?:\/\//, "")}</a>
      </td>
      ` : ""}
    </tr>
  </table>
  </div>
</body>
</html>`.trim();
}
