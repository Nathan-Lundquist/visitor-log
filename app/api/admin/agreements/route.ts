import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sql`
    SELECT id, file_url, filename, enabled, created_at, updated_at
    FROM agreements
    WHERE company_id = ${session.companyId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return NextResponse.json(result.rows[0] || null);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const blob = await put(`agreements/${session.companyId}-${Date.now()}.pdf`, file, {
    access: "public",
    contentType: "application/pdf",
  });

  // Delete existing agreement for this company (one active agreement at a time)
  const existing = await sql`SELECT id, file_url FROM agreements WHERE company_id = ${session.companyId}`;
  for (const row of existing.rows) {
    await del(row.file_url as string).catch(() => {});
    await sql`DELETE FROM agreements WHERE id = ${row.id}`;
  }

  await sql`
    INSERT INTO agreements (company_id, file_url, filename, enabled)
    VALUES (${session.companyId}, ${blob.url}, ${file.name}, true)
  `;

  // Auto-enable require_agreement on the company
  await sql`UPDATE companies SET require_agreement = true WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true, url: blob.url });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enabled } = await req.json();

  await sql`
    UPDATE agreements SET enabled = ${enabled}, updated_at = NOW()
    WHERE company_id = ${session.companyId}
  `;

  await sql`UPDATE companies SET require_agreement = ${enabled} WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await sql`SELECT id, file_url FROM agreements WHERE company_id = ${session.companyId}`;
  for (const row of existing.rows) {
    await del(row.file_url as string).catch(() => {});
    await sql`DELETE FROM agreements WHERE id = ${row.id}`;
  }

  await sql`UPDATE companies SET require_agreement = false WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true });
}
