import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import CheckInForm from "./CheckInForm";

export const dynamic = "force-dynamic";

export default async function CompanyCheckIn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const companyResult = await sql`SELECT id, name, slug, logo_url, welcome_message FROM companies WHERE slug = ${slug}`;
  const company = companyResult.rows[0];
  if (!company) notFound();

  const workersResult = await sql`SELECT id, name FROM workers WHERE company_id = ${company.id} ORDER BY name`;
  const workers = workersResult.rows as { id: number; name: string }[];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
          <p className="text-slate-500 mt-1">{company.welcome_message || "Visitor Check-In"}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {workers.length === 0 ? (
            <p className="text-center text-slate-500">
              No workers configured yet. Ask an admin to set up the worker list.
            </p>
          ) : (
            <CheckInForm workers={workers} companyId={company.id} slug={company.slug} />
          )}
        </div>
      </div>
    </div>
  );
}
