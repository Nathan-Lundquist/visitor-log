import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sql`
    SELECT name, slug, logo_url, welcome_message, primary_color, require_license, require_agreement, other_notify_email
    FROM companies WHERE id = ${session.companyId}
  `;

  return NextResponse.json(result.rows[0] || null);
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { welcome_message, primary_color, require_license, other_notify_email } = await req.json();

  await sql`
    UPDATE companies SET
      welcome_message = ${welcome_message ?? null},
      primary_color = ${primary_color ?? "#3b82f6"},
      require_license = ${require_license ?? false},
      other_notify_email = ${other_notify_email || null}
    WHERE id = ${session.companyId}
  `;

  return NextResponse.json({ ok: true });
}
