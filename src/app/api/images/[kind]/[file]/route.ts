import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDataUri } from "@/lib/hosted-images";

/**
 * Serves a stored certification or banner image by id, for the <img> tags in
 * signatures. Public on purpose: recipients' mail apps fetch these with no
 * session. Disabled images are still served, because emails already sent keep
 * linking to them.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/images/[kind]/[file]">) {
  const { kind, file } = await ctx.params;
  // "<id>.jpg" — the extension is only there for mail clients that look at it.
  const id = file.replace(/\.[a-z0-9]+$/i, "");

  const row =
    kind === "certification"
      ? await prisma.certification.findUnique({ where: { id }, select: { image: true } })
      : kind === "banner"
        ? await prisma.banner.findUnique({ where: { id }, select: { image: true } })
        : null;

  const image = parseDataUri(row?.image ?? null);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.bytes.length),
      // The URL carries a version that changes on edit, so this can be kept.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
