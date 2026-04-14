import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason } = await req.json();

  if (!first_name || !last_name || !phone || !worker_id || !reason) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  await sql`
    INSERT INTO visitors (first_name, last_name, phone, worker_id, reason)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id}, ${reason})
  `;

  return NextResponse.json({ ok: true });
}
