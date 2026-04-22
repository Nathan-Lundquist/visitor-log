# Multi-Tenant Visitor Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform single-tenant visitor check-in app into multi-tenant system with super admin company management, Microsoft SSO for company admins, and per-company public check-in pages.

**Architecture:** Three-tier model — super admin (PCShards, password auth) manages companies; company admins authenticate via Microsoft SSO and are routed by email domain; visitors access public check-in pages at `/c/[slug]`. All data scoped by `company_id`.

**Tech Stack:** Next.js 15, @vercel/postgres, next-auth v5 (Auth.js) with Microsoft Entra ID provider, Resend, Tailwind CSS 3.

---

## File Structure

### New files
- `auth.ts` — next-auth v5 configuration (Azure AD provider, session callbacks)
- `app/api/auth/[...nextauth]/route.ts` — next-auth route handler
- `app/c/[slug]/page.tsx` — public company check-in page (server component)
- `app/c/[slug]/CheckInForm.tsx` — check-in form scoped to company (client component)
- `app/super-admin/page.tsx` — super admin login page
- `app/super-admin/dashboard/page.tsx` — super admin company management
- `app/api/super-admin/auth/route.ts` — super admin auth endpoint
- `app/api/super-admin/companies/route.ts` — company CRUD API

### Modified files
- `lib/db.ts` — add `companies` table, add `company_id` columns, drop `settings` table
- `middleware.ts` — protect `/super-admin/dashboard/*`, `/admin/dashboard/*` (next-auth), scope API routes
- `app/page.tsx` — convert to landing page with links to admin/super-admin
- `app/admin/page.tsx` — replace password form with Microsoft SSO sign-in
- `app/admin/dashboard/page.tsx` — scope all data by `companyId` from session
- `app/api/checkin/route.ts` — accept and validate `company_id`
- `app/api/workers/route.ts` — scope by `company_id`
- `app/api/visitors/route.ts` — scope by `company_id`
- `app/api/settings/route.ts` — rewrite to read/write `companies` table
- `app/badge/[id]/page.tsx` — look up company from visitor, link back to `/c/[slug]`
- `app/badge/[id]/BadgeCard.tsx` — accept `slug` prop, redirect to `/c/[slug]` instead of `/`
- `app/checked-in/page.tsx` — accept slug param, redirect to `/c/[slug]`
- `lib/email.ts` — include company name in notification
- `package.json` — add `next-auth` dependency
- `.env.example` — add new env vars

### Removed files
- `app/components/CheckInForm.tsx` — replaced by `app/c/[slug]/CheckInForm.tsx`
- `app/api/auth/route.ts` — replaced by next-auth handler + super admin auth

---

## Task 1: Install dependencies and update env config

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env.local` (add placeholder keys)

- [ ] **Step 1: Install next-auth v5**

```bash
cd /home/nathan/projects/visitor-log
npm install next-auth@beta @auth/core
```

- [ ] **Step 2: Update `.env.example`**

Replace contents with:

```env
# Vercel Postgres (auto-set by Vercel)
POSTGRES_URL=

# Super Admin password (for PCShards admin panel)
SUPER_ADMIN_PASSWORD=changeme

# Microsoft Entra ID (Azure AD) — for company admin SSO
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=common

# NextAuth
AUTH_SECRET=
AUTH_URL=http://localhost:3000

# Email notifications (optional — uses Resend.com)
RESEND_API_KEY=
EMAIL_FROM="Visitor Log <noreply@resend.dev>"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add next-auth dependency and update env config for multi-tenant"
```

---

## Task 2: Database schema migration

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Rewrite `lib/db.ts`**

Replace the entire file with:

```typescript
import { sql } from "@vercel/postgres";

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      welcome_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS visitors (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      worker_id INTEGER REFERENCES workers(id),
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      checked_in_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Migration: add company_id to existing tables if missing
  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
  await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`;
}

export { sql };
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/nathan/projects/visitor-log
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add companies table, add company_id to workers and visitors"
```

---

## Task 3: Next-Auth configuration with Microsoft Entra ID

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Delete old: `app/api/auth/route.ts`

- [ ] **Step 1: Create `auth.ts` in project root**

```typescript
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { sql } from "@vercel/postgres";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "common",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const domain = user.email.split("@")[1];
      const result = await sql`SELECT id FROM companies WHERE domain = ${domain}`;
      if (result.rows.length === 0) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const domain = user.email.split("@")[1];
        const result = await sql`SELECT id, name, slug FROM companies WHERE domain = ${domain}`;
        if (result.rows[0]) {
          token.companyId = result.rows[0].id;
          token.companyName = result.rows[0].name;
          token.companySlug = result.rows[0].slug;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.companyId) {
        session.user.companyId = token.companyId as number;
        session.user.companyName = token.companyName as string;
        session.user.companySlug = token.companySlug as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
});
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

First delete the old auth route:

```bash
rm /home/nathan/projects/visitor-log/app/api/auth/route.ts
mkdir -p /home/nathan/projects/visitor-log/app/api/auth/\[...nextauth\]
```

Then create the file:

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Add type augmentation**

Create `types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      companyId: number;
      companyName: string;
      companySlug: string;
    };
  }
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add auth.ts app/api/auth/ types/
git commit -m "feat: add next-auth with Microsoft Entra ID provider"
```

---

## Task 4: Super admin auth and API

**Files:**
- Create: `app/api/super-admin/auth/route.ts`
- Create: `app/api/super-admin/companies/route.ts`

- [ ] **Step 1: Create super admin auth endpoint at `app/api/super-admin/auth/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.SUPER_ADMIN_PASSWORD || "changeme";

  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await sha256(`visitor-log-super:${expected}`);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("super_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
```

- [ ] **Step 2: Create companies CRUD at `app/api/super-admin/companies/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  const result = await sql`SELECT id, name, slug, domain, logo_url, welcome_message, created_at FROM companies ORDER BY name`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name, slug, domain, logo_url, welcome_message } = await req.json();
  if (!name?.trim() || !slug?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: "Name, slug, and domain are required" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  try {
    const result = await sql`
      INSERT INTO companies (name, slug, domain, logo_url, welcome_message)
      VALUES (${name.trim()}, ${cleanSlug}, ${domain.trim().toLowerCase()}, ${logo_url?.trim() || null}, ${welcome_message?.trim() || null})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique")) {
      return NextResponse.json({ error: "Slug or domain already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { id, name, slug, domain, logo_url, welcome_message } = await req.json();
  if (!id || !name?.trim() || !slug?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: "ID, name, slug, and domain are required" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  await sql`
    UPDATE companies
    SET name = ${name.trim()}, slug = ${cleanSlug}, domain = ${domain.trim().toLowerCase()},
        logo_url = ${logo_url?.trim() || null}, welcome_message = ${welcome_message?.trim() || null}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM companies WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/
git commit -m "feat: add super admin auth and company CRUD API"
```

---

## Task 5: Super admin UI

**Files:**
- Create: `app/super-admin/page.tsx`
- Create: `app/super-admin/dashboard/page.tsx`

- [ ] **Step 1: Create super admin login at `app/super-admin/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/super-admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/super-admin/dashboard");
    } else {
      setError("Invalid password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Super Admin</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Visitor Log Management</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create super admin dashboard at `app/super-admin/dashboard/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add app/super-admin/
git commit -m "feat: add super admin login and company management dashboard"
```

---

## Task 6: Public check-in page at `/c/[slug]`

**Files:**
- Create: `app/c/[slug]/page.tsx`
- Create: `app/c/[slug]/CheckInForm.tsx`

- [ ] **Step 1: Create server page at `app/c/[slug]/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Create client form at `app/c/[slug]/CheckInForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: number;
  name: string;
}

export default function CheckInForm({
  workers,
  companyId,
  slug,
}: {
  workers: Worker[];
  companyId: number;
  slug: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      first_name: form.get("first_name"),
      last_name: form.get("last_name"),
      phone: form.get("phone"),
      worker_id: Number(form.get("worker_id")),
      reason: form.get("reason"),
      company_id: companyId,
    };

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const { id } = await res.json();
      router.push(`/badge/${id}?slug=${slug}`);
    } else {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-lg";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
          <input name="first_name" required className={inputClass} placeholder="John" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
          <input name="last_name" required className={inputClass} placeholder="Smith" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
        <input name="phone" type="tel" required className={inputClass} placeholder="(555) 123-4567" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Who are you here to see?</label>
        <select name="worker_id" required className={inputClass}>
          <option value="">Select a person</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
        <textarea
          name="reason"
          required
          rows={3}
          className={inputClass}
          placeholder="Meeting, delivery, interview..."
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-lg transition"
      >
        {submitting ? "Checking in..." : "Check In"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/c/
git commit -m "feat: add public company check-in page at /c/[slug]"
```

---

## Task 7: Update check-in API to accept company_id

**Files:**
- Modify: `app/api/checkin/route.ts`

- [ ] **Step 1: Rewrite `app/api/checkin/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { notifyWorker } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { first_name, last_name, phone, worker_id, reason, company_id } = await req.json();

  if (!first_name || !last_name || !phone || !worker_id || !reason || !company_id) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  // Verify worker belongs to the company
  const workerCheck = await sql`SELECT id, name, email FROM workers WHERE id = ${worker_id} AND company_id = ${company_id}`;
  if (workerCheck.rows.length === 0) {
    return NextResponse.json({ error: "Invalid worker" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO visitors (first_name, last_name, phone, worker_id, company_id, reason)
    VALUES (${first_name}, ${last_name}, ${phone}, ${worker_id}, ${company_id}, ${reason})
    RETURNING id, checked_in_at
  `;

  const visitor = result.rows[0];
  const worker = workerCheck.rows[0];

  // Send email notification (non-blocking)
  if (worker.email) {
    // Get company name for email
    const companyResult = await sql`SELECT name FROM companies WHERE id = ${company_id}`;
    const companyName = companyResult.rows[0]?.name || "Visitor Log";

    notifyWorker({
      workerName: worker.name,
      workerEmail: worker.email,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      time: new Date(visitor.checked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      companyName,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: visitor.id });
}
```

- [ ] **Step 2: Update `lib/email.ts` to include company name**

```typescript
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface VisitorNotification {
  workerName: string;
  workerEmail: string;
  visitorName: string;
  phone: string;
  reason: string;
  time: string;
  companyName: string;
}

export async function notifyWorker(data: VisitorNotification) {
  if (!resend) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";

  await resend.emails.send({
    from: fromAddress,
    to: data.workerEmail,
    subject: `Visitor Arrival: ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <h2 style="margin-bottom: 4px;">Visitor Arrival — ${data.companyName}</h2>
        <p>Hi ${data.workerName},</p>
        <p><strong>${data.visitorName}</strong> has arrived to see you.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
        </table>
      </div>
    `,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/checkin/route.ts lib/email.ts
git commit -m "feat: scope check-in to company, include company name in email"
```

---

## Task 8: Update workers and visitors APIs to scope by company

**Files:**
- Modify: `app/api/workers/route.ts`
- Modify: `app/api/visitors/route.ts`

- [ ] **Step 1: Rewrite `app/api/workers/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const result = await sql`SELECT id, name, email FROM workers WHERE company_id = ${Number(companyId)} ORDER BY name`;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  await sql`INSERT INTO workers (name, email, company_id) VALUES (${name.trim()}, ${email?.trim() || null}, ${session.user.companyId})`;
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email } = await req.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "ID and name required" }, { status: 400 });
  }
  await sql`UPDATE workers SET name = ${name.trim()}, email = ${email?.trim() || null} WHERE id = ${id} AND company_id = ${session.user.companyId}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await sql`DELETE FROM workers WHERE id = ${Number(id)} AND company_id = ${session.user.companyId}`;
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Rewrite `app/api/visitors/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const date = req.nextUrl.searchParams.get("date");

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  let result;
  if (date) {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
             w.name AS worker_name
      FROM visitors v
      JOIN workers w ON w.id = v.worker_id
      WHERE v.company_id = ${Number(companyId)} AND v.checked_in_at::date = ${date}::date
      ORDER BY v.checked_in_at DESC
    `;
  } else {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
             w.name AS worker_name
      FROM visitors v
      JOIN workers w ON w.id = v.worker_id
      WHERE v.company_id = ${Number(companyId)}
      ORDER BY v.checked_in_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json(result.rows);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/workers/route.ts app/api/visitors/route.ts
git commit -m "feat: scope workers and visitors APIs by company"
```

---

## Task 9: Company admin SSO login page and dashboard

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Remove: `app/api/settings/route.ts`

- [ ] **Step 1: Rewrite `app/admin/page.tsx` for Microsoft SSO**

```tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminLogin() {
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError("Sign-in failed. Your company may not be registered yet. Contact your administrator.");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Company Admin</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Sign in with your company Microsoft account</p>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <a
            href="/api/auth/signin/microsoft-entra-id"
            className="flex items-center justify-center gap-3 w-full py-3 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white font-semibold rounded-lg transition"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Sign in with Microsoft
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/admin/dashboard/page.tsx` to use next-auth session**

Replace the entire file. The key changes: fetch `companyId` from session, pass it to all API calls, and update settings to write to the companies table.

```tsx
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
```

- [ ] **Step 3: Delete `app/api/settings/route.ts`**

```bash
rm /home/nathan/projects/visitor-log/app/api/settings/route.ts
```

Settings are now stored directly in the `companies` table and managed by the super admin.

- [ ] **Step 4: Commit**

```bash
git add app/admin/ && git rm app/api/settings/route.ts
git commit -m "feat: replace password admin with Microsoft SSO, scope dashboard by company"
```

---

## Task 10: Update badge and checked-in pages for multi-tenant

**Files:**
- Modify: `app/badge/[id]/page.tsx`
- Modify: `app/badge/[id]/BadgeCard.tsx`
- Modify: `app/checked-in/page.tsx`

- [ ] **Step 1: Rewrite `app/badge/[id]/page.tsx`**

```tsx
import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import BadgeCard from "./BadgeCard";

export const dynamic = "force-dynamic";

export default async function BadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { id } = await params;
  const { slug } = await searchParams;

  const result = await sql`
    SELECT v.id, v.first_name, v.last_name, v.phone, v.reason, v.checked_in_at,
           w.name AS worker_name, c.name AS company_name, c.slug AS company_slug
    FROM visitors v
    JOIN workers w ON w.id = v.worker_id
    JOIN companies c ON c.id = v.company_id
    WHERE v.id = ${Number(id)}
  `;

  const row = result.rows[0];
  if (!row) notFound();

  const visitor = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    worker_name: row.worker_name,
    reason: row.reason,
    checked_in_at: row.checked_in_at,
  };

  return (
    <BadgeCard
      visitor={visitor}
      companyName={row.company_name}
      slug={slug || row.company_slug}
    />
  );
}
```

- [ ] **Step 2: Update `app/badge/[id]/BadgeCard.tsx`**

Add `slug` prop and redirect to `/c/[slug]` instead of `/`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  visitor: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    worker_name: string;
    reason: string;
    checked_in_at: string;
  };
  companyName: string;
  slug: string;
}

export default function BadgeCard({ visitor, companyName, slug }: Props) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push(`/c/${slug}`), 30000);
    return () => clearTimeout(timer);
  }, [router, slug]);

  const date = new Date(visitor.checked_in_at);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
      <div id="badge" className="w-[400px] bg-white border-2 border-slate-300 rounded-xl overflow-hidden print:border-black print:rounded-none">
        <div className="bg-slate-800 text-white text-center py-3">
          <p className="text-xs uppercase tracking-widest opacity-70">{companyName}</p>
          <h1 className="text-2xl font-bold tracking-wide">VISITOR</h1>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">
              {visitor.first_name} {visitor.last_name}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Visiting</span>
              <span className="font-medium text-slate-800">{visitor.worker_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reason</span>
              <span className="font-medium text-slate-800">{visitor.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-800">
                {date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-800">
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-slate-400">Badge #{visitor.id}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
        >
          Print Badge
        </button>
        <button
          onClick={() => router.push(`/c/${slug}`)}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
        >
          Done
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-400 print:hidden">Returning to check-in in 30 seconds...</p>
    </div>
  );
}
```

- [ ] **Step 3: Remove `app/checked-in/page.tsx`**

This page is no longer needed — the badge page handles the post-checkin flow. The form redirects to `/badge/[id]?slug=[slug]` which auto-returns to `/c/[slug]`.

```bash
rm /home/nathan/projects/visitor-log/app/checked-in/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add app/badge/ && git rm app/checked-in/page.tsx
git commit -m "feat: update badge for multi-tenant, redirect to /c/[slug]"
```

---

## Task 11: Update middleware for new route structure

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Rewrite `middleware.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect super admin dashboard and API
  if (path.startsWith("/super-admin/dashboard") || path.startsWith("/api/super-admin/companies")) {
    const token = request.cookies.get("super_admin_token")?.value;
    const password = process.env.SUPER_ADMIN_PASSWORD || "changeme";
    const expected = await sha256(`visitor-log-super:${password}`);

    if (token !== expected) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
  }

  // Company admin dashboard is protected by next-auth (handled in the page/API)
  // No middleware needed for /admin/dashboard — next-auth session check happens server-side

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/dashboard/:path*", "/api/super-admin/companies/:path*"],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: update middleware for super admin route protection"
```

---

## Task 12: Update home page and cleanup

**Files:**
- Modify: `app/page.tsx`
- Remove: `app/components/CheckInForm.tsx`
- Modify: `app/api/setup/route.ts`

- [ ] **Step 1: Rewrite `app/page.tsx` as landing page**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/admin");
}
```

- [ ] **Step 2: Delete old CheckInForm**

```bash
rm /home/nathan/projects/visitor-log/app/components/CheckInForm.tsx
rmdir /home/nathan/projects/visitor-log/app/components 2>/dev/null || true
```

- [ ] **Step 3: Update `app/api/setup/route.ts`**

No changes needed — it already calls `ensureTables()` which now creates the companies table.

- [ ] **Step 4: Verify the build compiles**

```bash
cd /home/nathan/projects/visitor-log
npx next build 2>&1 | tail -30
```

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx && git rm app/components/CheckInForm.tsx
git commit -m "feat: redirect home to admin, remove old single-tenant check-in form"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run dev server and verify all routes**

```bash
cd /home/nathan/projects/visitor-log
npm run dev
```

Verify these routes work:
- `/` — redirects to `/admin`
- `/super-admin` — shows login form
- `/super-admin/dashboard` — (after login) shows company CRUD
- `/admin` — shows Microsoft SSO button
- `/c/[slug]` — shows check-in form (after creating a company via super admin)

- [ ] **Step 2: Test database setup**

```bash
curl -X POST http://localhost:3000/api/setup
```

Expected: `{"ok":true,"message":"Tables created"}`

- [ ] **Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "chore: final cleanup for multi-tenant visitor log"
```
