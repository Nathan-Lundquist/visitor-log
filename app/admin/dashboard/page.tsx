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
  email: string | null;
}

export default function Dashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<"log" | "workers" | "settings">("log");
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [settings, setSettings] = useState({ company_name: "", welcome_message: "", logo_url: "" });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadVisitors();
    loadWorkers();
    loadSettings();
  }, []);

  useEffect(() => {
    loadVisitors();
  }, [dateFilter]);

  async function loadVisitors() {
    const res = await fetch(`/api/visitors?date=${dateFilter}`);
    if (res.ok) setVisitors(await res.json());
  }

  async function loadWorkers() {
    const res = await fetch("/api/workers");
    if (res.ok) setWorkers(await res.json());
  }

  async function loadSettings() {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings({
        company_name: data.company_name || "",
        welcome_message: data.welcome_message || "",
        logo_url: data.logo_url || "",
      });
    }
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

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
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

  const tabClass = (t: string) =>
    `px-4 py-2 rounded-lg font-medium text-sm transition ${
      tab === t ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200"
    }`;

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition";

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
          <button onClick={() => setTab("log")} className={tabClass("log")}>Visitor Log</button>
          <button onClick={() => setTab("workers")} className={tabClass("workers")}>Workers</button>
          <button onClick={() => setTab("settings")} className={tabClass("settings")}>Settings</button>
        </div>

        {/* Visitor Log Tab */}
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
                        <td className="px-4 py-3">
                          <a
                            href={`/badge/${v.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Badge
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Workers Tab */}
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
                  <li
                    key={w.id}
                    className="px-4 py-3 border-b border-slate-50 last:border-0"
                  >
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
                          <button
                            onClick={() => setEditingWorker(w)}
                            className="text-sm text-blue-500 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeWorker(w.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <form onSubmit={saveSettings} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="Your Company"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1">Shown at the top of the check-in page and on badges.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
                <input
                  value={settings.welcome_message}
                  onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                  placeholder="Visitor Check-In"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1">Subtitle below the company name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                <input
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1">Direct link to your company logo image.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Save Settings
                </button>
                {settingsSaved && <span className="text-sm text-green-600">Saved!</span>}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
