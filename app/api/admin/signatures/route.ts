import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visitorId = req.nextUrl.searchParams.get("visitorId");

  if (visitorId) {
    const result = await sql`
      SELECT vs.id, vs.signature_url, vs.signed_at, a.filename
      FROM visitor_signatures vs
      JOIN agreements a ON a.id = vs.agreement_id
      WHERE vs.visitor_id = ${Number(visitorId)}
      ORDER BY vs.signed_at DESC
    `;
    return NextResponse.json(result.rows);
  }

  // List all signatures for this company's agreement
  const result = await sql`
    SELECT vs.id, vs.signature_url, vs.signed_at, a.filename,
           v.first_name, v.last_name
    FROM visitor_signatures vs
    JOIN agreements a ON a.id = vs.agreement_id
    JOIN visitors v ON v.id = vs.visitor_id
    WHERE a.company_id = ${session.companyId}
    ORDER BY vs.signed_at DESC
    LIMIT 100
  `;
  return NextResponse.json(result.rows);
}
