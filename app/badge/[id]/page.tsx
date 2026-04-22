import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import BadgeCard from "./BadgeCard";

export const dynamic = "force-dynamic";

export default async function BadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { id } = await params;
  const { slug } = await searchParams;

  const result = await sql`
    SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
           w.name AS worker_name, c.name AS company_name, c.slug AS company_slug
    FROM visitors v
    JOIN workers w ON w.id = v.worker_id
    JOIN companies c ON c.id = v.company_id
    WHERE v.id = ${Number(id)}
  `;

  const row = result.rows[0];
  if (!row) notFound();

  const visitor = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    worker_name: row.worker_name,
    reason: row.reason,
    checked_in_at: row.checked_in_at,
  };

  return (
    <BadgeCard
      visitor={visitor}
      companyName={row.company_name}
      slug={slug || row.company_slug}
    />
  );
}
