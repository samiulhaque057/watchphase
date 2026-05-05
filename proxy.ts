import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }
  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const apiToken = process.env.ADMIN_API_TOKEN;
  const authHeader = request.headers.get("authorization");
  if (apiToken && authHeader === `Bearer ${apiToken}`) {
    return NextResponse.next();
  }

  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (await verifyAdminSessionToken(session)) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/admin/:path*"],
};

