import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

function withBasePath(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const url = new URL(req.url);
    url.pathname = `/bss-sig${url.pathname}`;
    return handler(new NextRequest(url, req));
  };
}

export const GET = withBasePath(handlers.GET);
export const POST = withBasePath(handlers.POST);
