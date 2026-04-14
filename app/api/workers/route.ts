import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  const result = await sql`SELECT id, name FROM workers ORDER BY name`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await sql`INSERT INTO workers (name) VALUES (${name.trim()})`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM workers WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
