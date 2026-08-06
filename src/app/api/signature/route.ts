import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOfficeToken } from "@/lib/azure-token";
import { resolveSignature } from "@/lib/signature-resolver";
import { generateSignatureHtml } from "@/lib/signature-template";
import { resolveSender } from "@/lib/shared-mailbox";

// Optimize for faster response
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(request: NextRequest) {
  try {
    // Local-development escape hatch. Deliberately ignored in production: this
    // endpoint returns personal data (name, job title, phone numbers, postal
    // address), so a deployed environment must never serve it unauthenticated.
    // There is no `trusted=office`-style bypass — a query parameter is not a
    // credential and anyone can send one.
    const SKIP_AUTH =
      process.env.SKIP_SIGNATURE_AUTH === "true" &&
      process.env.NODE_ENV !== "production";

    const { searchParams } = new URL(request.url);
    let email: string | undefined;
    // The human at the keyboard, per the verified Office SSO token. A shared
    // mailbox has sign-in blocked and can never produce a token, so this is
    // always a real person — that is what makes shared mailboxes resolvable.
    let signedInEmail: string | undefined;

    const authHeader = request.headers.get("authorization");
    const hasToken = authHeader?.startsWith("Bearer ") ?? false;

    if (hasToken) {
      const token = authHeader!.slice(7);
      try {
        const tokenPayload = await verifyOfficeToken(token);
        signedInEmail =
          tokenPayload.preferred_username?.toLowerCase() ??
          tokenPayload.upn?.toLowerCase() ??
          tokenPayload.email?.toLowerCase();
        email = searchParams.get("email")?.toLowerCase() ?? signedInEmail;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Token verification failed";
        // Logged loudly: a token that fails to verify is almost always an
        // AZURE_AD_APP_URI / manifest <Resource> mismatch, and silently
        // ignoring it degrades into "sender unknown" with no visible cause.
        console.error("Office SSO token rejected:", message);
        if (!SKIP_AUTH) {
          return NextResponse.json({ error: message }, { status: 401 });
        }
        email = searchParams.get("email")?.toLowerCase();
      }
    } else if (SKIP_AUTH) {
      console.warn(
        "SKIP_SIGNATURE_AUTH is on — serving signature without authentication (development only)"
      );
      email = searchParams.get("email")?.toLowerCase();
    } else {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required (query param or token claim)" },
        { status: 400 }
      );
    }

    // 3. Work out whose signature this is. For a shared mailbox the "from"
    //    address is the same for everyone, so the signed-in identity decides.
    const sender = await resolveSender({
      fromEmail: email,
      signedInEmail,
      selectedMsUserId: searchParams.get("as"),
    });

    if (sender.status === "not_found") {
      return NextResponse.json(
        { error: `User not found: ${sender.email}` },
        { status: 404 }
      );
    }

    if (sender.status === "needs_selection") {
      // 409: the request is valid but we cannot tell who is sending. The
      // add-in shows these candidates and retries with ?as=<id>.
      return NextResponse.json(
        {
          error: "shared_mailbox_requires_selection",
          message:
            `${sender.sharedMailboxEmail} is a shared mailbox and the sender could not be identified. Choose who is sending.`,
          sharedMailbox: sender.sharedMailboxEmail,
          candidates: sender.candidates,
        },
        { status: 409 }
      );
    }

    const user = await prisma.msUser.findUnique({
      where: { id: sender.msUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${sender.email}` },
        { status: 404 }
      );
    }

    // 4. Resolve signature
    const signature = await resolveSignature(user.id);

    // 5. Generate HTML
    const baseUrl = process.env.AUTH_URL || new URL(request.url).origin;
    const html = generateSignatureHtml(
      user,
      signature.certifications,
      signature.banners,
      signature.disclaimers,
      {
        defaultCompanyName: signature.countryBranding.companyName,
        website: signature.countryBranding.website ?? undefined,
        logoUrl: `${baseUrl}/blackstone-logo.png`,
        registrationText: signature.registrationLine?.text,
        footerLeft: signature.footerLine?.leftText,
        footerRight: signature.footerLine?.rightText,
      }
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Identifies whose signature this is — useful for the add-in UI.
        "X-Signature-User": user.email,
        "X-Signature-Via-Shared-Mailbox": String(sender.viaSharedMailbox),
        // Per-user content behind a shared URL: never cache on shared CDNs.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Signature API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
