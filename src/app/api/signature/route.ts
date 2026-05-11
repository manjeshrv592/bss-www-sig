import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOfficeToken } from "@/lib/azure-token";
import { resolveSignature } from "@/lib/signature-resolver";
import { generateSignatureHtml } from "@/lib/signature-template";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Azure token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    let tokenPayload;
    try {
      tokenPayload = await verifyOfficeToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Token verification failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    // 2. Get email from query param or from token
    const { searchParams } = new URL(request.url);
    const email =
      searchParams.get("email")?.toLowerCase() ??
      tokenPayload.preferred_username?.toLowerCase() ??
      tokenPayload.upn?.toLowerCase() ??
      tokenPayload.email?.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required (query param or token claim)" },
        { status: 400 }
      );
    }

    // 3. Find user
    const user = await prisma.msUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 }
      );
    }

    // 4. Resolve signature
    const signature = await resolveSignature(user.id);

    // 5. Generate HTML
    const html = generateSignatureHtml(
      user,
      signature.certifications,
      signature.banners,
      signature.legalTexts,
      {
        defaultCompanyName: signature.countryBranding.companyName,
        website: signature.countryBranding.website ?? undefined,
      }
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
