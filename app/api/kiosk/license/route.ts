import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const visitorId = formData.get("visitor_id") as string | null;

  if (!file || !visitorId) {
    return NextResponse.json({ error: "file and visitor_id required" }, { status: 400 });
  }

  const blob = await put(`licenses/${visitorId}-${Date.now()}.jpg`, file, {
    access: "public",
  });

  await sql`
    INSERT INTO visitor_licenses (visitor_id, photo_url)
    VALUES (${Number(visitorId)}, ${blob.url})
  `;

  return NextResponse.json({ ok: true, url: blob.url });
}
