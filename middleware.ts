import { NextRequest, NextResponse } from "next/server";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect super admin dashboard and API
  if (path.startsWith("/super-admin/dashboard") || path.startsWith("/api/super-admin/companies") || path.startsWith("/api/super-admin/admins")) {
    const token = request.cookies.get("super_admin_token")?.value;
    const password = process.env.SUPER_ADMIN_PASSWORD || "changeme";
    const expected = await sha256(`visitor-log-super:${password}`);

    if (token !== expected) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/dashboard/:path*", "/api/super-admin/companies/:path*", "/api/super-admin/admins/:path*"],
};
