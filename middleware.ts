import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect super admin dashboard and API — require logged-in pcshards.com user
  if (path.startsWith("/super-admin/dashboard") || path.startsWith("/api/super-admin/companies") || path.startsWith("/api/super-admin/admins")) {
    const raw = request.cookies.get("admin_session")?.value;
    let isPcshards = false;

    if (raw) {
      try {
        const session = JSON.parse(Buffer.from(raw, "base64").toString());
        if (session.email?.endsWith("@pcshards.com")) {
          isPcshards = true;
        }
      } catch {}
    }

    if (!isPcshards) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/dashboard/:path*", "/api/super-admin/companies/:path*", "/api/super-admin/admins/:path*"],
};
