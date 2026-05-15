import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET: list today's checked-in visitors for a company
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const result = await sql`
    SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at, v.checked_out_at,
           v.us_citizen, v.company_name, v.badge_number,
           w.name AS worker_name
    FROM visitors v
    LEFT JOIN workers w ON w.id = v.worker_id
    WHERE v.company_id = ${Number(companyId)}
      AND v.checked_in_at::date = CURRENT_DATE
    ORDER BY v.checked_in_at DESC
  `;

  return NextResponse.json(result.rows);
}

// POST: check out a visitor
export async function POST(req: NextRequest) {
  const { visitor_id, company_id } = await req.json();
  if (!visitor_id || !company_id) {
    return NextResponse.json({ error: "visitor_id and company_id required" }, { status: 400 });
  }

  await sql`UPDATE visitors SET checked_out_at = NOW() WHERE id = ${visitor_id} AND company_id = ${company_id} AND checked_out_at IS NULL`;
  return NextResponse.json({ ok: true });
}
