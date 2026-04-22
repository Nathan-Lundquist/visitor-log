import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const result = await sql`SELECT id, name, slug FROM companies WHERE domain = ${domain}`;
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "No company registered for this email domain" }, { status: 404 });
  }

  const company = result.rows[0];
  const session = {
    email: email.trim().toLowerCase(),
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
  };

  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");

  const res = NextResponse.json({ ok: true, companyName: company.name });
  res.cookies.set("admin_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return res;
}
