import { NextResponse } from "next/server";
import { ensureTables } from "@/lib/db";

export async function POST() {
  try {
    await ensureTables();
    return NextResponse.json({ ok: true, message: "Tables created" });
  } catch (error) {
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}
