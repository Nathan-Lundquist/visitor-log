import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const result = await sql`SELECT key, value FROM settings`;
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(req: NextRequest) {
  const updates: Record<string, string> = await req.json();

  for (const [key, value] of Object.entries(updates)) {
    await sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}
    `;
  }

  return NextResponse.json({ ok: true });
}
