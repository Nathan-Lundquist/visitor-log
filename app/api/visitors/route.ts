import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  let result;
  if (date) {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
             w.name AS worker_name
      FROM visitors v
      JOIN workers w ON w.id = v.worker_id
      WHERE v.checked_in_at::date = ${date}::date
      ORDER BY v.checked_in_at DESC
    `;
  } else {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
             w.name AS worker_name
      FROM visitors v
      JOIN workers w ON w.id = v.worker_id
      ORDER BY v.checked_in_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json(result.rows);
}
