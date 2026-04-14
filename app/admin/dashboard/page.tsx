"use client";

import { useEffect, useState } from "react";

interface Visitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  worker_name: string;
  reason: string;
  checked_in_at: string;
}

interface Worker {
  id: number;
  name: string;
}

export default function Dashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorker, setNewWorker] = useState("");
  const [tab, setTab] = useState<"log" | "workers">("log");
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadVisitors();
    loadWorkers();
  }, [dateFilter]);

  async function loadVisitors() {
    const res = await fetch(`/api/visitors?date=${dateFilter}`);
    if (res.ok) setVisitors(await res.json());
  }

  async function loadWorkers() {
    const res = await fetch("/api/workers");
    if (res.ok) setWorkers(await res.json());
  }

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorker.trim()) return;
    await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newWorker.trim() }),
    });
    setNewWorker("");
    loadWorkers();
  }

  async function removeWorker(id: number) {
    if (!confirm("Remove this worker?")) return;
    await fetch(`/api/workers?id=${id}`, { method: "DELETE" });
    loadWorkers();
  }

  function exportCSV() {
    const header = "First Name,Last Name,Phone,Visiting,Reason,Time";
    const rows = visitors.map(
      (v) =>
        `"${v.first_name}","${v.last_name}","${v.phone}","${v.worker_name}","${v.reason}","${new Date(v.checked_in_at).toLocaleString()}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitors-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Visitor Log</h1>
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
          Logout
        </a>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("log")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              tab === "log" ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Visitor Log
          </button>
          <button
            onClick={() => setTab("workers")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              tab === "workers" ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Manage Workers
          </button>
        </div>

        {tab === "log" && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{visitors.length} visitor(s)</span>
                <button
                  onClick={exportCSV}
                  className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {visitors.length === 0 ? (
              <p className="p-8 text-center text-slate-400">No visitors for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Phone</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {v.first_name} {v.last_name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{v.phone}</td>
                        <td className="px-4 py-3 text-slate-600">{v.worker_name}</td>
                        <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(v.checked_in_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "workers" && (
          <div className="bg-white rounded-xl border border-slate-200">
            <form onSubmit={addWorker} className="p-4 border-b border-slate-200 flex gap-3">
              <input
                value={newWorker}
                onChange={(e) => setNewWorker(e.target.value)}
                placeholder="Worker name"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Add
              </button>
            </form>

            {workers.length === 0 ? (
              <p className="p-8 text-center text-slate-400">No workers added yet.</p>
            ) : (
              <ul>
                {workers.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0"
                  >
                    <span className="font-medium text-slate-700">{w.name}</span>
                    <button
                      onClick={() => removeWorker(w.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
