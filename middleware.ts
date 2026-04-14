import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/dashboard")) {
    const token = request.cookies.get("admin_token")?.value;
    const password = process.env.ADMIN_PASSWORD || "changeme";
    const expected = createHash("sha256").update(`visitor-log:${password}`).digest("hex");

    if (token !== expected) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
