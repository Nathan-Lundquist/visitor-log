import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { notifyWorker, notifyAdmins } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason, company_id } = await req.json();

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
    INSERT INTO visitors (first_name, last_name, phone, worker_id, company_id, reason)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id || null}, ${company_id}, ${reason})
    RETURNING id, checked_in_at
  `;

  const visitor = result.rows[0];

  // Send email notification (non-blocking)
  if (worker?.email) {
    const companyResult = await sql`SELECT name FROM companies WHERE id = ${company_id}`;
    const companyName = companyResult.rows[0]?.name || "Visitor Log";

    notifyWorker({
      workerName: worker.name,
      workerEmail: worker.email,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      time: new Date(visitor.checked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      companyName,
    }).catch(() => {});
  }

  // Notify all company admins
  const adminsResult = await sql`SELECT email FROM admins WHERE company_id = ${company_id}`;
  const adminEmails = adminsResult.rows.map((r: { email: string }) => r.email);

  if (adminEmails.length > 0) {
    const companyResult2 = await sql`SELECT name FROM companies WHERE id = ${company_id}`;
    const companyNameForAdmin = companyResult2.rows[0]?.name || "Visitor Log";

    notifyAdmins({
      adminEmails,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      workerName: worker?.name || null,
      time: new Date(visitor.checked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      companyName: companyNameForAdmin,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: visitor.id });
}
