import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { notifyWorker } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason } = await req.json();

  if (!first_name || !last_name || !phone || !worker_id || !reason) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO visitors (first_name, last_name, phone, worker_id, reason)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id}, ${reason})
    RETURNING id, checked_in_at
  `;

  const visitor = result.rows[0];

  // Send email notification (non-blocking)
  const worker = await sql`SELECT name, email FROM workers WHERE id = ${worker_id}`;
  if (worker.rows[0]?.email) {
    notifyWorker({
      workerName: worker.rows[0].name,
      workerEmail: worker.rows[0].email,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      time: new Date(visitor.checked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }).catch(() => {}); // Don't fail check-in if email fails
  }

  return NextResponse.json({ ok: true, id: visitor.id });
}
