import { sql } from "@vercel/postgres";
import CheckInForm from "./components/CheckInForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const companyName = process.env.COMPANY_NAME || "Welcome";

  let workers: { id: number; name: string }[] = [];
  try {
    const result = await sql`SELECT id, name FROM workers ORDER BY name`;
    workers = result.rows as { id: number; name: string }[];
  } catch {
    // Tables may not exist yet — form will show message
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">{companyName}</h1>
          <p className="text-slate-500 mt-1">Visitor Check-In</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {workers.length === 0 ? (
            <p className="text-center text-slate-500">
              No workers configured yet. Ask an admin to set up the worker list at{" "}
              <a href="/admin" className="text-blue-600 underline">/admin</a>.
            </p>
          ) : (
            <CheckInForm workers={workers} />
          )}
        </div>
      </div>
    </div>
  );
}
