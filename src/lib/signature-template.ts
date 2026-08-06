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
  /** Single line under the disclaimer, styled to match it. */
  registrationText?: string | null;
  /** Footer cells. Fall back to the tagline/website defaults when unassigned. */
  footerLeft?: string | null;
  footerRight?: string | null;
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

  // Build address over two lines:
  //   Line 1: street address, city
  //   Line 2: state/province, country, zipcode
  const addressLines: string[] = [];

  const line1 = [user.streetAddress, user.city].filter(Boolean).join(", ");
  if (line1) addressLines.push(line1);

  const line2 = [user.state, user.country, user.postalCode]
    .filter(Boolean)
    .join(", ");
  if (line2) addressLines.push(line2);

  const hasAddress = addressLines.length > 0;

  // Generate certification images HTML.
  // Images are rendered inline (not as separate table cells) inside a single
  // fixed-width cell so that when their combined width exceeds the signature
  // width they wrap onto the next line instead of overflowing. Tables can't
  // wrap, and flexbox/flex-wrap isn't supported in classic Outlook (Word
  // renderer), so inline images are the email-safe way to get reflow.
  //
  // No width or height is set: each logo renders at its natural size, so the
  // uploaded file alone decides how it looks. Only spacing and baseline
  // alignment are styled here.
  let certificationsHtml = "";
  const activeCerts = certifications.filter((c) => c.image);
  if (activeCerts.length > 0) {
    certificationsHtml = activeCerts
      .map(
        (cert) =>
          `<img src="${cert.image}" alt="${cert.alt ?? cert.name}" style="display: inline-block; vertical-align: middle; margin: 0 0 10px 14px;" />`
      )
      .join("");
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

  // Escape user-entered plain text so it can't inject markup into the signature.
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Registration line — sits directly under the disclaimer and deliberately
  // reuses the disclaimer's styling.
  const registrationText = options.registrationText?.trim();
  const registrationHtml = registrationText
    ? `
      <div style="font-size: 12px; color: #6b7280; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; text-align: justify; padding-top: 8px;">
        ${escapeHtml(registrationText)}
      </div>`
    : "";

  // Generate legal text HTML
  let legalTextHtml = "";
  if (legalTexts.length > 0 || registrationHtml) {
    const ltContent = legalTexts
      .map(
        (lt) => `
      <div style="font-size: 12px; color: #6b7280; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; text-align: justify;">
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
          ${registrationHtml}
        </td>
      </tr>
    </table>`;
  }

  // Footer cells. An assigned footer line replaces the defaults; otherwise the
  // original tagline/website pair is used, so unassigned users are unaffected.
  const footerLeft = options.footerLeft?.trim() || options.tagline || "";
  const footerRight = options.footerRight?.trim() || website || "";

  // A footer cell that looks like a web address is rendered as a link, matching
  // how the website has always been shown there.
  function footerCellHtml(value: string): string {
    if (!value) return "";
    const looksLikeUrl = /^(https?:\/\/|www\.)|^[\w-]+(\.[\w-]+)+\/?$/i.test(value);
    if (!looksLikeUrl) {
      return `<span style="color: #2563eb; font-weight: 600;">${escapeHtml(value)}</span>`;
    }
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const label = value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `<a href="${escapeHtml(href)}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">${escapeHtml(label)}</a>`;
  }

  const footerLeftHtml = footerCellHtml(footerLeft);
  const footerRightHtml = footerCellHtml(footerRight);

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
              <span style="font-size: 15px; font-weight: 600; color: #374151; display: block;">${designation}</span>
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

  <!-- Certifications (fixed signature width; logos wrap to next row when they overflow) -->
  ${activeCerts.length > 0 ? `
  <table cellpadding="0" cellspacing="0" border="0" width="500" style="margin-top: 15px; width: 500px; table-layout: fixed;">
    <tr>
      <td align="right" style="text-align: right; line-height: 0; font-size: 0;">
        ${certificationsHtml}
      </td>
    </tr>
  </table>
  ` : ""}
  ${bannersHtml}
  ${legalTextHtml}

  <!-- Footer: width attribute + align attribute used for classic Outlook (Word renderer ignores width:100% CSS) -->
  <table cellpadding="0" cellspacing="0" border="0" width="500" style="margin-top: 15px; width: 500px;">
    <tr>
      <td style="font-size: 14px; color: #2563eb; font-weight: 600; white-space: nowrap;">
        ${footerLeftHtml}
      </td>
      ${footerRightHtml ? `
      <td align="right" style="font-size: 14px; text-align: right; white-space: nowrap;">
        ${footerRightHtml}
      </td>
      ` : ""}
    </tr>
  </table>
  </div>
</body>
</html>`.trim();
}
