"use client";

import { useEffect, useState } from "react";

interface Company {
  id: number;
  name: string;
  slug: string;
  domain: string;
  logo_url: string | null;
  welcome_message: string | null;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", domain: "", logo_url: "", welcome_message: "" });
  const [error, setError] = useState("");

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    const res = await fetch("/api/super-admin/companies");
    if (res.ok) setCompanies(await res.json());
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;

    const res = await fetch("/api/super-admin/companies", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setForm({ name: "", slug: "", domain: "", logo_url: "", welcome_message: "" });
      setEditing(null);
      loadCompanies();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
  }

  async function deleteCompany(id: number) {
    if (!confirm("Delete this company and all its data? This cannot be undone.")) return;
    await fetch(`/api/super-admin/companies?id=${id}`, { method: "DELETE" });
    loadCompanies();
  }

  function startEdit(c: Company) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      domain: c.domain,
      logo_url: c.logo_url || "",
      welcome_message: c.welcome_message || "",
    });
  }

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Super Admin</h1>
        <a href="/super-admin" className="text-sm text-slate-500 hover:text-slate-700">Logout</a>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Add / Edit Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editing ? "Edit Company" : "Add Company"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({ ...f, name, slug: editing ? f.slug : autoSlug(name) }));
                  }}
                  placeholder="Acme Corp"
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                <div className="flex items-center">
                  <span className="text-sm text-slate-400 mr-1">/c/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="acme"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Domain</label>
                <input
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="acme.com"
                  required
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1">Users with @acme.com emails can sign in as admins</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                <input
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
              <input
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                placeholder="Welcome to Acme Corp"
                className={inputClass}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                {editing ? "Save Changes" : "Add Company"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(null); setForm({ name: "", slug: "", domain: "", logo_url: "", welcome_message: "" }); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Companies List */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">{companies.length} Companies</h2>
          </div>
          {companies.length === 0 ? (
            <p className="p-8 text-center text-slate-400">No companies yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Slug</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Domain</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <a href={`/c/${c.slug}`} className="text-blue-600 hover:underline">/c/{c.slug}</a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.domain}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(c)} className="text-sm text-blue-500 hover:text-blue-700">Edit</button>
                          <button onClick={() => deleteCompany(c.id)} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
