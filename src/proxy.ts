import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[PROXY] pathname:", pathname);
  console.log("[PROXY] request.url:", request.url);

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isSignatureApi = pathname.startsWith("/api/signature");
  const isLoginPage = pathname === "/login";
  const isOfficeAddin =
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".png");

  if (isAuthRoute || isSignatureApi || isLoginPage || isOfficeAddin) {
    console.log("[PROXY] bypassing auth check for:", pathname);
    return NextResponse.next();
  }

  const session = await auth();
  console.log("[PROXY] session:", session ? "exists" : "null");

  if (!session) {
    const loginUrl = new URL("/bss-sig/login", request.url);
    const callbackUrl = request.url.replace(/^http:\/\//, "https://");
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    console.log("[PROXY] redirecting to:", loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
