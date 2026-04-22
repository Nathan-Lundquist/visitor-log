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

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");

  let result;
  if (companyId) {
    result = await sql`
      SELECT a.id, a.email, a.company_id, c.name AS company_name, a.created_at
      FROM admins a JOIN companies c ON c.id = a.company_id
      WHERE a.company_id = ${Number(companyId)}
      ORDER BY a.email
    `;
  } else {
    result = await sql`
      SELECT a.id, a.email, a.company_id, c.name AS company_name, a.created_at
      FROM admins a JOIN companies c ON c.id = a.company_id
      ORDER BY c.name, a.email
    `;
  }
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { email, password, company_id } = await req.json();

  if (!email?.trim() || !password || !company_id) {
    return NextResponse.json({ error: "Email, password, and company are required" }, { status: 400 });
  }

  const passwordHash = await sha256(`visitor-log-admin:${password}`);

  try {
    await sql`
      INSERT INTO admins (email, password_hash, company_id)
      VALUES (${email.trim().toLowerCase()}, ${passwordHash}, ${company_id})
    `;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "Admin with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { id, email, password } = await req.json();

  if (!id || !email?.trim()) {
    return NextResponse.json({ error: "ID and email required" }, { status: 400 });
  }

  if (password) {
    const passwordHash = await sha256(`visitor-log-admin:${password}`);
    await sql`UPDATE admins SET email = ${email.trim().toLowerCase()}, password_hash = ${passwordHash} WHERE id = ${id}`;
  } else {
    await sql`UPDATE admins SET email = ${email.trim().toLowerCase()} WHERE id = ${id}`;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM admins WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
