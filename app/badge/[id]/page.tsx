import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import BadgeCard from "./BadgeCard";

export const dynamic = "force-dynamic";

export default async function BadgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let visitor: { id: number; first_name: string; last_name: string; phone: string; worker_name: string; reason: string; checked_in_at: string } | undefined;
  try {
    const result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
             w.name AS worker_name
      FROM visitors v
      JOIN workers w ON w.id = v.worker_id
      WHERE v.id = ${Number(id)}
    `;
    visitor = result.rows[0] as typeof visitor;
  } catch {
    notFound();
  }

  if (!visitor) notFound();

  let companyName = process.env.COMPANY_NAME || "Visitor";
  try {
    const s = await sql`SELECT value FROM settings WHERE key = 'company_name'`;
    if (s.rows[0]) companyName = s.rows[0].value;
  } catch {}

  return <BadgeCard visitor={visitor} companyName={companyName} />;
}
