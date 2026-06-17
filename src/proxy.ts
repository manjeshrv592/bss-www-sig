import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isSignatureApi = pathname.startsWith("/api/signature");
  const isLoginPage = pathname === "/login";
  // Unlisted root/break-glass login page — must be reachable without a session.
  const isRootLoginPage = pathname === "/root";
  // Office add-in well-known allow-list (.well-known/microsoft-officeaddins-allowed.json).
  // Classic Outlook on Windows fetches this to authorize the event-based JS runtime; it must
  // return the raw JSON, not an auth redirect.
  const isWellKnown = pathname.startsWith("/.well-known");
  const isOfficeAddin =
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".png");

  if (isAuthRoute || isSignatureApi || isLoginPage || isRootLoginPage || isWellKnown || isOfficeAddin) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session) {
    const baseUrl = process.env.AUTH_URL || request.nextUrl.origin;
    const loginUrl = new URL("/login", baseUrl);
    const callbackUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl);
    loginUrl.searchParams.set("callbackUrl", callbackUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
