import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");

  if (!domain?.trim()) {
    return NextResponse.json({ error: "Domain required" }, { status: 400 });
  }

  const result = await sql`SELECT slug FROM companies WHERE domain = ${domain.trim().toLowerCase()}`;

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "No company registered for this email domain" }, { status: 404 });
  }

  return NextResponse.json({ slug: result.rows[0].slug });
}
