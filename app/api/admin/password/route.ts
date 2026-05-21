import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/auth";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { current_password, new_password } = await req.json();

  if (!new_password || new_password.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  // If must_change_password, current_password is the one they just logged in with — still verify it
  if (!current_password) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  }

  const currentHash = await sha256(`visitor-log-admin:${current_password}`);
  const verify = await sql`SELECT id FROM admins WHERE email = ${session.email} AND password_hash = ${currentHash}`;

  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const newHash = await sha256(`visitor-log-admin:${new_password}`);
  await sql`UPDATE admins SET password_hash = ${newHash}, must_change_password = false WHERE email = ${session.email}`;

  // Update session cookie to clear the flag
  const updatedSession = { ...session, mustChangePassword: false };
  const encoded = Buffer.from(JSON.stringify(updatedSession)).toString("base64");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
