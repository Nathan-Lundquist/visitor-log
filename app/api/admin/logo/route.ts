import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }

  const blob = await put(`logos/${session.companyId}-${Date.now()}.${file.name.split(".").pop()}`, file, {
    access: "public",
  });

  await sql`UPDATE companies SET logo_url = ${blob.url} WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true, url: blob.url });
}
