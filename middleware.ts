import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "visitor-log-default-secret-change-me";

function verifySession(raw: string): Record<string, unknown> | null {
  try {
    const dotIndex = raw.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payload = raw.substring(0, dotIndex);
    const signature = raw.substring(dotIndex + 1);

    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect super admin dashboard and API — require logged-in pcshards.com user
  if (path.startsWith("/super-admin/dashboard") || path.startsWith("/api/super-admin/companies") || path.startsWith("/api/super-admin/admins")) {
    const raw = request.cookies.get("admin_session")?.value;
    let isPcshards = false;

    if (raw) {
      const session = verifySession(raw);
      if (session && typeof session.email === "string" && session.email.endsWith("@pcshards.com")) {
        isPcshards = true;
      }
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
