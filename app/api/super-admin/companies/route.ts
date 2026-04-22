import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  const result = await sql`SELECT id, name, slug, domain, logo_url, welcome_message, created_at FROM companies ORDER BY name`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name, slug, domain, logo_url, welcome_message } = await req.json();
  if (!name?.trim() || !slug?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: "Name, slug, and domain are required" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  try {
    const result = await sql`
      INSERT INTO companies (name, slug, domain, logo_url, welcome_message)
      VALUES (${name.trim()}, ${cleanSlug}, ${domain.trim().toLowerCase()}, ${logo_url?.trim() || null}, ${welcome_message?.trim() || null})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "Slug or domain already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { id, name, slug, domain, logo_url, welcome_message } = await req.json();
  if (!id || !name?.trim() || !slug?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: "ID, name, slug, and domain are required" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  await sql`
    UPDATE companies
    SET name = ${name.trim()}, slug = ${cleanSlug}, domain = ${domain.trim().toLowerCase()},
        logo_url = ${logo_url?.trim() || null}, welcome_message = ${welcome_message?.trim() || null}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM companies WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
