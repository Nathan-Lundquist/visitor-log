import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await sha256(`visitor-log-admin:${password}`);

  const result = await sql`
    SELECT a.id, a.email, a.company_id, c.name AS company_name, c.slug AS company_slug
    FROM admins a
    JOIN companies c ON c.id = a.company_id
    WHERE a.email = ${cleanEmail} AND a.password_hash = ${passwordHash}
  `;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const admin = result.rows[0];
  const session = {
    email: admin.email,
    companyId: admin.company_id,
    companyName: admin.company_name,
    companySlug: admin.company_slug,
  };

  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");

  const res = NextResponse.json({ ok: true, companyName: admin.company_name });
  res.cookies.set("admin_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
