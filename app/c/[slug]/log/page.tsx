import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import VisitorLog from "./VisitorLog";

export const dynamic = "force-dynamic";

export default async function VisitorLogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const companyResult = await sql`
    SELECT id, name, slug, logo_url, primary_color
    FROM companies WHERE slug = ${slug}
  `;

  if (companyResult.rows.length === 0) {
    notFound();
  }

  const company = companyResult.rows[0];

  return (
    <VisitorLog
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logo_url,
        primaryColor: company.primary_color || "#3b82f6",
      }}
    />
  );
}
