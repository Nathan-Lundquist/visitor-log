"use client";

import { useEffect, useState, useCallback } from "react";

interface Visitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  worker_name: string | null;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
  us_citizen: boolean | null;
  company_name: string | null;
  badge_number: string | null;
}

interface CompanyInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
}

export default function VisitorLog({ company }: { company: CompanyInfo }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [now, setNow] = useState(new Date());

  const loadVisitors = useCallback(async () => {
    const res = await fetch(`/api/kiosk/visitors?companyId=${company.id}`);
    if (res.ok) {
      setVisitors(await res.json());
      setNow(new Date());
    }
  }, [company.id]);

  useEffect(() => {
    loadVisitors();
    const interval = setInterval(loadVisitors, 10_000);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  async function checkOut(visitorId: number) {
    await fetch("/api/kiosk/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId, company_id: company.id }),
    });
    loadVisitors();
  }

  const checkedIn = visitors.filter((v) => !v.checked_out_at);
  const checkedOut = visitors.filter((v) => v.checked_out_at);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="px-6 py-4 text-white"
        style={{ backgroundColor: company.primaryColor }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-8 h-8 rounded-lg object-contain bg-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                {company.name.charAt(0)}
              </div>
            )}
            <h1 className="text-lg font-bold">{company.name} — Visitor Log</h1>
          </div>
          <div className="text-sm opacity-80">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Currently checked in */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Currently Checked In ({checkedIn.length})
          </h2>
          {checkedIn.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              No visitors currently checked in
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Citizen</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Badge</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">In</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {checkedIn.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {v.first_name} {v.last_name}
                        </div>
                        <div className="text-xs text-slate-400">{v.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.company_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.worker_name || "General Visit"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                      <td className="px-4 py-3">
                        {v.us_citizen === true && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Yes</span>
                        )}
                        {v.us_citizen === false && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">No</span>
                        )}
                        {v.us_citizen === null && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.badge_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_in_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => checkOut(v.id)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg transition"
                          style={{
                            backgroundColor: company.primaryColor + "15",
                            color: company.primaryColor,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              company.primaryColor + "25";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              company.primaryColor + "15";
                          }}
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Checked out today */}
        {checkedOut.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Checked Out ({checkedOut.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Citizen</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Badge</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">In</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedOut.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {v.first_name} {v.last_name}
                        </div>
                        <div className="text-xs text-slate-400">{v.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.company_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.worker_name || "General Visit"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                      <td className="px-4 py-3">
                        {v.us_citizen === true && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Yes</span>
                        )}
                        {v.us_citizen === false && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">No</span>
                        )}
                        {v.us_citizen === null && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.badge_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_in_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_out_at!).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-center text-xs text-slate-400">
          Auto-refreshes every 10 seconds &middot; Last updated{" "}
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
