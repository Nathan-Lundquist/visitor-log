import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { visitor_id, agreement_id, signature_data } = await req.json();

  if (!visitor_id || !agreement_id || !signature_data) {
    return NextResponse.json({ error: "visitor_id, agreement_id, and signature_data required" }, { status: 400 });
  }

  // signature_data is a base64 data URL like "data:image/png;base64,..."
  const base64 = signature_data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(`signatures/${visitor_id}-${Date.now()}.png`, buffer, {
    access: "public",
    contentType: "image/png",
  });

  await sql`
    INSERT INTO visitor_signatures (visitor_id, agreement_id, signature_url)
    VALUES (${Number(visitor_id)}, ${Number(agreement_id)}, ${blob.url})
  `;

  return NextResponse.json({ ok: true, url: blob.url });
}
