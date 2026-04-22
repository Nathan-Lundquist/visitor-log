import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const result = await sql`SELECT id, name, email FROM workers WHERE company_id = ${Number(companyId)} ORDER BY name`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await sql`INSERT INTO workers (name, email, company_id) VALUES (${name.trim()}, ${email?.trim() || null}, ${session.companyId})`;
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email } = await req.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID and name required" }, { status: 400 });
  }
  await sql`UPDATE workers SET name = ${name.trim()}, email = ${email?.trim() || null} WHERE id = ${id} AND company_id = ${session.companyId}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM workers WHERE id = ${Number(id)} AND company_id = ${session.companyId}`;
  return NextResponse.json({ ok: true });
}
