# Plan 3: Admin Dashboard Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the company admin dashboard from a 2-tab layout (Visitor Log, Workers) into a 4-tab management console (Visitors, Workers, Agreements, Settings) with stats bar, search/filter, license photo viewing, and company branding configuration.

**Architecture:** Single page component split into tab components for maintainability. Each tab is its own file. The main dashboard page handles session loading and tab navigation. Stats are fetched from the new `/api/admin/stats` endpoint.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS

**Depends on:** Plan 1 (database & API foundation) must be completed first.

---

## File Structure

```
app/admin/dashboard/
├── page.tsx                    # Main dashboard — session check, tab nav, stats
├── tabs/
│   ├── VisitorsTab.tsx         # Visitor log with search, date filter, license view
│   ├── WorkersTab.tsx          # Worker CRUD with title field
│   ├── AgreementsTab.tsx       # Agreement PDF upload and management
│   └── SettingsTab.tsx         # Company branding and kiosk configuration
```

---

### Task 1: Create VisitorsTab

**Files:**
- Create: `app/admin/dashboard/tabs/VisitorsTab.tsx`

- [ ] **Step 1: Create tabs directory and VisitorsTab**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/admin/dashboard/tabs
```

Write `app/admin/dashboard/tabs/VisitorsTab.tsx`:

```typescript
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
}

export default function VisitorsTab({ companyId }: { companyId: number }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [rangeFilter, setRangeFilter] = useState<"date" | "week" | "month">("date");
  const [search, setSearch] = useState("");
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVisitors();
  }, [dateFilter, rangeFilter]);

  async function loadVisitors() {
    let url = `/api/visitors?companyId=${companyId}`;
    if (rangeFilter === "date") {
      url += `&date=${dateFilter}`;
    } else {
      url += `&range=${rangeFilter}`;
    }
    const res = await fetch(url);
    if (res.ok) setVisitors(await res.json());
  }

  function exportCSV() {
    const header = "First Name,Last Name,Phone,Visiting,Reason,Check In,Check Out";
    const rows = visitors.map(
      (v) =>
        `"${v.first_name}","${v.last_name}","${v.phone}","${v.worker_name || "General Visit"}","${v.reason}","${new Date(v.checked_in_at).toLocaleString()}","${v.checked_out_at ? new Date(v.checked_out_at).toLocaleString() : "Still in"}"`
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

  const filtered = visitors.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.first_name.toLowerCase().includes(s) ||
      v.last_name.toLowerCase().includes(s) ||
      (v.worker_name && v.worker_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitors..."
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-48"
          />
          <select
            value={rangeFilter}
            onChange={(e) => setRangeFilter(e.target.value as "date" | "week" | "month")}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="date">Specific Date</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          {rangeFilter === "date" && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
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
                <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">In</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Out</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">License</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.first_name} {v.last_name}</div>
                    <div className="text-xs text-slate-400">{v.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.worker_name || "General Visit"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.reason}</td>
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
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/dashboard/tabs/VisitorsTab.tsx
git commit -m "feat: add VisitorsTab with search, date/range filter, CSV export, license viewing"
```

---

### Task 2: Create WorkersTab

**Files:**
- Create: `app/admin/dashboard/tabs/WorkersTab.tsx`

- [ ] **Step 1: Write the WorkersTab component**

Write `app/admin/dashboard/tabs/WorkersTab.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/dashboard/tabs/WorkersTab.tsx
git commit -m "feat: add WorkersTab with title field support"
```

---

### Task 3: Create AgreementsTab

**Files:**
- Create: `app/admin/dashboard/tabs/AgreementsTab.tsx`

- [ ] **Step 1: Write the AgreementsTab component**

Write `app/admin/dashboard/tabs/AgreementsTab.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

interface AgreementData {
  id: number;
  file_url: string;
  filename: string;
  enabled: boolean;
  created_at: string;
}

interface SignedAgreement {
  id: number;
  signature_url: string;
  signed_at: string;
  filename: string;
  first_name: string;
  last_name: string;
}

export default function AgreementsTab() {
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [signatures, setSignatures] = useState<SignedAgreement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAgreement();
    loadSignatures();
  }, []);

  async function loadAgreement() {
    const res = await fetch("/api/admin/agreements");
    if (res.ok) {
      const data = await res.json();
      setAgreement(data);
    }
  }

  async function loadSignatures() {
    const res = await fetch("/api/admin/signatures");
    if (res.ok) {
      setSignatures(await res.json());
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/agreements", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      loadAgreement();
    } else {
      const data = await res.json();
      setError(data.error || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function toggleEnabled() {
    if (!agreement) return;
    await fetch("/api/admin/agreements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !agreement.enabled }),
    });
    loadAgreement();
  }

  async function deleteAgreement() {
    if (!confirm("Remove this agreement? Visitors will no longer be asked to sign.")) return;
    await fetch("/api/admin/agreements", { method: "DELETE" });
    setAgreement(null);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">NDA / Agreement</h2>
      <p className="text-sm text-slate-500 mb-6">
        Upload a PDF that visitors must review and sign during check-in.
      </p>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!agreement ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No agreement uploaded yet</p>
          <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer">
            {uploading ? "Uploading..." : "Upload PDF"}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-800">{agreement.filename}</p>
              <p className="text-sm text-slate-400">
                Uploaded {new Date(agreement.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={agreement.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View PDF
              </a>
              <button onClick={deleteAgreement} className="text-sm text-red-500 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Require signature during check-in</p>
              <p className="text-sm text-slate-400">Visitors will see this agreement and must sign</p>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative w-12 h-7 rounded-full transition ${
                agreement.enabled ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  agreement.enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition cursor-pointer">
              {uploading ? "Uploading..." : "Replace PDF"}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Signed agreements list */}
      {signatures.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Signed Agreements ({signatures.length})
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Signed</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Signature</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(s.signed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={s.signature_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/dashboard/tabs/AgreementsTab.tsx
git commit -m "feat: add AgreementsTab with PDF upload, toggle, signed agreements list"
```

---

### Task 4: Create SettingsTab

**Files:**
- Create: `app/admin/dashboard/tabs/SettingsTab.tsx`
- Create: `app/api/admin/settings/route.ts`

- [ ] **Step 1: Create admin settings API**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/admin/settings
```

Write `app/api/admin/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sql`
    SELECT name, slug, logo_url, welcome_message, primary_color, require_license, require_agreement
    FROM companies WHERE id = ${session.companyId}
  `;

  return NextResponse.json(result.rows[0] || null);
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { welcome_message, primary_color, require_license } = await req.json();

  await sql`
    UPDATE companies SET
      welcome_message = ${welcome_message ?? null},
      primary_color = ${primary_color ?? "#3b82f6"},
      require_license = ${require_license ?? false}
    WHERE id = ${session.companyId}
  `;

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the SettingsTab component**

Write `app/admin/dashboard/tabs/SettingsTab.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

interface Settings {
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  require_license: boolean;
  require_agreement: boolean;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [requireLicense, setRequireLicense] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setWelcomeMessage(data.welcome_message || "");
      setPrimaryColor(data.primary_color || "#3b82f6");
      setRequireLicense(data.require_license || false);
    }
  }

  async function handleSave() {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        welcome_message: welcomeMessage.trim() || null,
        primary_color: primaryColor,
        require_license: requireLicense,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/logo", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      loadSettings();
    }
    setUploadingLogo(false);
    e.target.value = "";
  }

  function copyKioskUrl() {
    if (!settings) return;
    const url = `${window.location.origin}/c/${settings.slug}`;
    navigator.clipboard.writeText(url);
  }

  if (!settings) {
    return <p className="text-slate-400 text-center py-8">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Kiosk URL */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Kiosk URL</h2>
        <p className="text-sm text-slate-500 mb-4">Share this link to set up a check-in kiosk</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            {typeof window !== "undefined" ? `${window.location.origin}/c/${settings.slug}` : `/c/${settings.slug}`}
          </code>
          <button
            onClick={copyKioskUrl}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Branding</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Logo</label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                  No logo
                </div>
              )}
              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition cursor-pointer">
                {uploadingLogo ? "Uploading..." : settings.logo_url ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
            <input
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome to our office"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
              <div className="w-24 h-10 rounded-lg" style={{ backgroundColor: primaryColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Kiosk Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Kiosk Configuration</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Require Photo ID</p>
              <p className="text-sm text-slate-400">Visitors must photograph their license during check-in</p>
            </div>
            <button
              onClick={() => setRequireLicense(!requireLicense)}
              className={`relative w-12 h-7 rounded-full transition ${
                requireLicense ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  requireLicense ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <div>
              <p className="font-medium text-slate-700">Require Agreement Signing</p>
              <p className="text-sm text-slate-400">Managed in the Agreements tab</p>
            </div>
            <div className={`relative w-12 h-7 rounded-full ${settings.require_agreement ? "bg-blue-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow ${settings.require_agreement ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          Save Settings
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/settings/route.ts app/admin/dashboard/tabs/SettingsTab.tsx
git commit -m "feat: add SettingsTab with branding, kiosk config, and kiosk URL"
```

---

### Task 5: Rewrite dashboard page with stats and 4-tab layout

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire dashboard page**

Replace the entire content of `app/admin/dashboard/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VisitorsTab from "./tabs/VisitorsTab";
import WorkersTab from "./tabs/WorkersTab";
import AgreementsTab from "./tabs/AgreementsTab";
import SettingsTab from "./tabs/SettingsTab";

interface SessionUser {
  email: string;
  companyId: number;
  companyName: string;
  companySlug: string;
}

interface Stats {
  checkedInNow: number;
  today: number;
  thisWeek: number;
  workers: number;
}

type Tab = "visitors" | "workers" | "agreements" | "settings";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("visitors");
  const [stats, setStats] = useState<Stats>({ checkedInNow: 0, today: 0, thisWeek: 0, workers: 0 });

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.companyId) {
          setUser(data.user);
          setLoading(false);
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    if (user) {
      fetch(`/api/admin/stats?companyId=${user.companyId}`)
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "visitors", label: "Visitors" },
    { id: "workers", label: "Workers" },
    { id: "agreements", label: "Agreements" },
    { id: "settings", label: "Settings" },
  ];

  function handleSignOut() {
    document.cookie = "admin_session=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">{user?.companyName}</h1>
            <div className="hidden sm:flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    tab === t.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">{user?.email}</span>
            <button onClick={handleSignOut} className="text-sm text-slate-500 hover:text-slate-700">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Checked In Now</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.checkedInNow}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Today</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.today}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">This Week</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.thisWeek}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Workers</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.workers}</div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex gap-2 mb-6 sm:hidden overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                tab === t.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "visitors" && user && <VisitorsTab companyId={user.companyId} />}
        {tab === "workers" && user && <WorkersTab companyId={user.companyId} />}
        {tab === "agreements" && <AgreementsTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat: redesign admin dashboard with 4-tab layout and stats bar"
```

---

### Task 6: Deploy and test

- [ ] **Step 1: Deploy**

```bash
cd /home/nathan/projects/visitor-log && vercel --prod --yes
```

- [ ] **Step 2: Test all tabs**

Log in as `h.sova@bricowelding.com` and verify:
- Stats bar shows correct counts
- Visitors tab has search, date filter, range filter, CSV export
- Workers tab has title field, add/edit/remove
- Agreements tab allows PDF upload and toggle
- Settings tab has welcome message, color picker, kiosk URL copy, license toggle

- [ ] **Step 3: Commit any fixes**
