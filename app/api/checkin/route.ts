import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { notifyWorker } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason, company_id } = await req.json();

  if (!first_name || !last_name || !phone || !worker_id || !reason || !company_id) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  // Verify worker belongs to the company
  const workerCheck = await sql`SELECT id, name, email FROM workers WHERE id = ${worker_id} AND company_id = ${company_id}`;
  if (workerCheck.rows.length === 0) {
    return NextResponse.json({ error: "Invalid worker" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO visitors (first_name, last_name, phone, worker_id, company_id, reason)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id}, ${company_id}, ${reason})
    RETURNING id, checked_in_at
  `;

  const visitor = result.rows[0];
  const worker = workerCheck.rows[0];

  // Send email notification (non-blocking)
  if (worker.email) {
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

  return NextResponse.json({ ok: true, id: visitor.id });
}
