"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  email: string | null;
}

interface SessionUser {
  name: string;
  email: string;
  companyId: number;
  companyName: string;
  companySlug: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<"log" | "workers">("log");
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.companyId) {
          setUser(data.user);
          setLoading(false);
        } else {
          router.push("/admin");
        }
      })
      .catch(() => router.push("/admin"));
  }, [router]);

  useEffect(() => {
    if (user) loadVisitors();
  }, [user, dateFilter]);

  useEffect(() => {
    if (user) loadWorkers();
  }, [user]);

  async function loadVisitors() {
    if (!user) return;
    const res = await fetch(`/api/visitors?companyId=${user.companyId}&date=${dateFilter}`);
    if (res.ok) setVisitors(await res.json());
  }

  async function loadWorkers() {
    if (!user) return;
    const res = await fetch(`/api/workers?companyId=${user.companyId}`);
    if (res.ok) setWorkers(await res.json());
  }

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newWorkerName.trim(), email: newWorkerEmail.trim() || null }),
    });
    setNewWorkerName("");
    setNewWorkerEmail("");
    loadWorkers();
  }

  async function updateWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWorker) return;
    await fetch("/api/workers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingWorker),
    });
    setEditingWorker(null);
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const tabClass = (t: string) =>
    `px-4 py-2 rounded-lg font-medium text-sm transition ${
      tab === t ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{user?.companyName}</h1>
          <p className="text-xs text-slate-400">Check-in page: /c/{user?.companySlug}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <a href="/api/auth/signout" className="text-sm text-slate-500 hover:text-slate-700">Sign Out</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("log")} className={tabClass("log")}>Visitor Log</button>
          <button onClick={() => setTab("workers")} className={tabClass("workers")}>Workers</button>
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
                      <th className="text-left px-4 py-3 font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{v.first_name} {v.last_name}</td>
                        <td className="px-4 py-3 text-slate-600">{v.phone}</td>
                        <td className="px-4 py-3 text-slate-600">{v.worker_name}</td>
                        <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(v.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/badge/${v.id}`} target="_blank" className="text-blue-600 hover:text-blue-800 text-xs">Badge</a>
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
            <form onSubmit={addWorker} className="p-4 border-b border-slate-200">
              <div className="flex gap-3">
                <input
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  placeholder="Email (optional)"
                  type="email"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>
            </form>

            {workers.length === 0 ? (
              <p className="p-8 text-center text-slate-400">No workers added yet.</p>
            ) : (
              <ul>
                {workers.map((w) => (
                  <li key={w.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                    {editingWorker?.id === w.id ? (
                      <form onSubmit={updateWorker} className="flex gap-3 items-center">
                        <input
                          value={editingWorker.name}
                          onChange={(e) => setEditingWorker({ ...editingWorker, name: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                          value={editingWorker.email || ""}
                          onChange={(e) => setEditingWorker({ ...editingWorker, email: e.target.value || null })}
                          placeholder="Email"
                          type="email"
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                        <button type="submit" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Save</button>
                        <button type="button" onClick={() => setEditingWorker(null)} className="text-sm text-slate-500">Cancel</button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-700">{w.name}</span>
                          {w.email && <span className="ml-3 text-sm text-slate-400">{w.email}</span>}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setEditingWorker(w)} className="text-sm text-blue-500 hover:text-blue-700">Edit</button>
                          <button onClick={() => removeWorker(w.id)} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      </div>
                    )}
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
