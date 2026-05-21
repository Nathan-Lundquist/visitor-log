import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = session.companyId;

  const [checkedInNow, today, thisWeek, workerCount] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at::date = CURRENT_DATE AND checked_out_at IS NULL`,
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at::date = CURRENT_DATE`,
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at >= NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*) AS count FROM workers WHERE company_id = ${cid}`,
  ]);

  return NextResponse.json({
    checkedInNow: Number(checkedInNow.rows[0].count),
    today: Number(today.rows[0].count),
    thisWeek: Number(thisWeek.rows[0].count),
    workers: Number(workerCount.rows[0].count),
  });
}
