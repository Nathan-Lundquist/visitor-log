import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const result = await sql`
    SELECT id, file_url, filename
    FROM agreements
    WHERE company_id = ${Number(companyId)} AND enabled = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json(result.rows[0]);
}
