import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { notifyWorker, notifyAdmins, notifyOtherReason } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason, company_id, us_citizen, company_name, badge_number } = await req.json();

  if (!first_name || !last_name || !phone || !reason || !company_id) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  let worker = null;

  // Verify worker belongs to the company (if specified)
  if (worker_id) {
    const workerCheck = await sql`SELECT id, name, email FROM workers WHERE id = ${worker_id} AND company_id = ${company_id}`;
    if (workerCheck.rows.length === 0) {
      return NextResponse.json({ error: "Invalid worker" }, { status: 400 });
    }
    worker = workerCheck.rows[0];
  }

  const result = await sql`
    INSERT INTO visitors (first_name, last_name, phone, worker_id, company_id, reason, us_citizen, company_name, badge_number)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id || null}, ${company_id}, ${reason}, ${us_citizen ?? null}, ${company_name || null}, ${badge_number || null})
    RETURNING id, checked_in_at
  `;

  const visitor = result.rows[0];

  // Fetch company info once for all notifications
  const companyResult = await sql`SELECT name, other_notify_email FROM companies WHERE id = ${company_id}`;
  const companyName = companyResult.rows[0]?.name || "Visitor Log";
  const otherNotifyEmail = companyResult.rows[0]?.other_notify_email;

  const timeStr = new Date(visitor.checked_in_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Send email notification to worker (non-blocking)
  if (worker?.email) {
    notifyWorker({
      workerName: worker.name,
      workerEmail: worker.email,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      time: timeStr,
      companyName,
    }).catch(() => {});
  }

  // Notify all company admins
  const adminsResult = await sql`SELECT email FROM admins WHERE company_id = ${company_id}`;
  const adminEmails = adminsResult.rows.map((r) => r.email as string);

  if (adminEmails.length > 0) {
    notifyAdmins({
      adminEmails,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      workerName: worker?.name || null,
      time: timeStr,
      companyName,
    }).catch(() => {});
  }

  // Notify "Other" reason email if configured and reason is Other-type
  if (otherNotifyEmail && !worker_id) {
    notifyOtherReason({
      toEmail: otherNotifyEmail,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      companyName,
      time: timeStr,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: visitor.id });
}
