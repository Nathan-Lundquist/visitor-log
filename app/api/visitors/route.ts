import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const date = req.nextUrl.searchParams.get("date");
  const range = req.nextUrl.searchParams.get("range"); // "week" or "month"
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  let result;
  if (startDate && endDate) {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at, v.us_citizen, v.company_name, v.badge_number,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
        AND v.checked_in_at::date >= ${startDate}::date
        AND v.checked_in_at::date <= ${endDate}::date
      ORDER BY v.checked_in_at DESC
    `;
  } else if (date) {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at, v.us_citizen, v.company_name, v.badge_number,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)} AND v.checked_in_at::date = ${date}::date
      ORDER BY v.checked_in_at DESC
    `;
  } else if (range === "week") {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at, v.us_citizen, v.company_name, v.badge_number,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
        AND v.checked_in_at >= NOW() - INTERVAL '7 days'
      ORDER BY v.checked_in_at DESC
    `;
  } else if (range === "month") {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at, v.us_citizen, v.company_name, v.badge_number,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
        AND v.checked_in_at >= NOW() - INTERVAL '30 days'
      ORDER BY v.checked_in_at DESC
    `;
  } else {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at, v.us_citizen, v.company_name, v.badge_number,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
      ORDER BY v.checked_in_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json(result.rows);
}
