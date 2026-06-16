"use client";

import { useEffect, useState } from "react";

interface Visitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  worker_name: string | null;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
  license_photo_url: string | null;
  us_citizen: boolean | null;
  company_name: string | null;
  badge_number: string | null;
}

export default function VisitorsTab({ companyId }: { companyId: number }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [rangeFilter, setRangeFilter] = useState<"all" | "date" | "week" | "month" | "range">("all");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVisitors();
  }, [dateFilter, rangeFilter, startDate, endDate]);

  async function loadVisitors() {
    let url = `/api/visitors?companyId=${companyId}`;
    if (rangeFilter === "date") {
      url += `&date=${dateFilter}`;
    } else if (rangeFilter === "range") {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    } else if (rangeFilter !== "all") {
      url += `&range=${rangeFilter}`;
    }
    const res = await fetch(url);
    if (res.ok) setVisitors(await res.json());
  }

  function csvCell(value: string): string {
    const escaped = value.replace(/"/g, '""');
    const dangerous = ["=", "+", "-", "@", "\t", "\r"];
    if (dangerous.some((c) => escaped.startsWith(c))) {
      return `"'${escaped}"`;
    }
    return `"${escaped}"`;
  }

  function exportCSV() {
    const header = "First Name,Last Name,Phone,Company,Visiting,Reason,US Citizen,Badge #,Check In,Check Out";
    const rows = filtered.map(
      (v) =>
        [
          csvCell(v.first_name),
          csvCell(v.last_name),
          csvCell(v.phone),
          csvCell(v.company_name || ""),
          csvCell(v.worker_name || "General Visit"),
          csvCell(v.reason),
          csvCell(v.us_citizen === true ? "Yes" : v.us_citizen === false ? "No" : ""),
          csvCell(v.badge_number || ""),
          csvCell(new Date(v.checked_in_at).toLocaleString()),
          csvCell(v.checked_out_at ? new Date(v.checked_out_at).toLocaleString() : "Still in"),
        ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitors-${rangeFilter === "all" ? "all" : rangeFilter === "range" ? `${startDate}_${endDate}` : dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = visitors.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.first_name.toLowerCase().includes(s) ||
      v.last_name.toLowerCase().includes(s) ||
      (v.worker_name && v.worker_name.toLowerCase().includes(s)) ||
      (v.company_name && v.company_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitors..."
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-48"
          />
          <select
            value={rangeFilter}
            onChange={(e) => setRangeFilter(e.target.value as "all" | "date" | "week" | "month" | "range")}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="all">All Time</option>
            <option value="date">Specific Date</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="range">Date Range</option>
          </select>
          {rangeFilter === "date" && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          )}
          {rangeFilter === "range" && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtered.length} visitor(s)</span>
          <button
            onClick={exportCSV}
            className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-slate-400">No visitors found.</p>
      ) : (
        <div className="overflow-x-auto">
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
                <th className="text-left px-4 py-3 font-medium text-slate-500">License</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className={`border-b border-slate-50 ${!v.checked_out_at ? "bg-green-50 hover:bg-green-100" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.first_name} {v.last_name}</div>
                    <div className="text-xs text-slate-400">{v.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.company_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.worker_name || "General Visit"}</td>
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
                    {new Date(v.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    {v.checked_out_at ? (
                      <span className="text-slate-500">
                        {new Date(v.checked_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">In</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.license_photo_url ? (
                      <button
                        onClick={() => setLicenseUrl(v.license_photo_url)}
                        className="text-sm text-blue-500 hover:text-blue-700"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* License photo modal */}
      {licenseUrl && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setLicenseUrl(null)}
        >
          <div className="bg-white rounded-xl p-4 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800">License Photo</h3>
              <button onClick={() => setLicenseUrl(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <img src={licenseUrl} alt="License" className="max-w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
