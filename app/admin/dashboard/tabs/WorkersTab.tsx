"use client";

import { useEffect, useState } from "react";

interface Worker {
  id: number;
  name: string;
  email: string | null;
  title: string | null;
}

export default function WorkersTab({ companyId }: { companyId: number }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState({ name: "", email: "", title: "" });
  const [editing, setEditing] = useState<Worker | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    const res = await fetch(`/api/workers?companyId=${companyId}`);
    if (res.ok) setWorkers(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editing) {
      await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: form.name.trim(),
          email: form.email.trim() || null,
          title: form.title.trim() || null,
        }),
      });
      setEditing(null);
    } else {
      await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          title: form.title.trim() || null,
        }),
      });
    }
    setForm({ name: "", email: "", title: "" });
    loadWorkers();
  }

  function startEdit(w: Worker) {
    setEditing(w);
    setForm({ name: w.name, email: w.email || "", title: w.title || "" });
  }

  async function removeWorker(id: number) {
    if (!confirm("Remove this worker?")) return;
    await fetch(`/api/workers?id=${id}`, { method: "DELETE" });
    loadWorkers();
  }

  const inputClass = "px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition";

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200">
        <div className="flex gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            required
            className={`flex-1 ${inputClass}`}
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email (optional)"
            type="email"
            className={`flex-1 ${inputClass}`}
          />
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (optional)"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            {editing ? "Save" : "Add"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ name: "", email: "", title: "" }); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg transition hover:bg-slate-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {workers.length === 0 ? (
        <p className="p-8 text-center text-slate-400">No workers added yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-slate-500">{w.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{w.title || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(w)} className="text-sm text-blue-500 hover:text-blue-700">Edit</button>
                      <button onClick={() => removeWorker(w.id)} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
