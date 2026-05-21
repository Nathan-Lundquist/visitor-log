import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import KioskWizard from "./KioskWizard";
import type { Agreement } from "./types";

export const dynamic = "force-dynamic";

export default async function CompanyCheckIn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const companyResult = await sql`
    SELECT id, name, slug, logo_url, welcome_message, primary_color, require_license, require_agreement
    FROM companies WHERE slug = ${slug}
  `;
  const company = companyResult.rows[0];
  if (!company) notFound();

  const workersResult = await sql`SELECT id, name, title FROM workers WHERE company_id = ${company.id} ORDER BY name`;

  // Fetch active agreement if required
  let agreement: Agreement | null = null;
  if (company.require_agreement) {
    const agResult = await sql`
      SELECT id, file_url, filename FROM agreements
      WHERE company_id = ${company.id} AND enabled = true
      ORDER BY created_at DESC LIMIT 1
    `;
    agreement = (agResult.rows[0] as Agreement) || null;
  }

  return (
    <KioskWizard
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url,
        welcome_message: company.welcome_message,
        primary_color: company.primary_color || "#3b82f6",
        require_license: company.require_license || false,
        require_agreement: company.require_agreement || false,
      }}
      workers={workersResult.rows as { id: number; name: string; title: string | null }[]}
      agreement={agreement}
    />
  );
}
