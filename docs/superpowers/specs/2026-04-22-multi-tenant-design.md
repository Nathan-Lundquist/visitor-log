# Multi-Tenant Visitor Log — Design Spec

## Overview

Transform the single-tenant visitor check-in app into a multi-tenant system where PCShards (super admin) manages multiple client companies. Each company gets a branded public check-in page and a Microsoft SSO-protected admin dashboard.

## Architecture

Three-tier access model:

| Layer | URL | Auth | Purpose |
|-------|-----|------|---------|
| Super Admin | `/super-admin` | Password (`SUPER_ADMIN_PASSWORD` env var) | PCShards adds/manages companies |
| Company Admin | `/admin` | Microsoft SSO (email domain → company) | Company staff manages workers, settings, visitor log |
| Visitor Check-in | `/c/[slug]` | None (public) | Visitors check in at kiosk |

## Database Schema

### New table: `companies`

```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  welcome_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Modified table: `workers`

Add `company_id` foreign key:

```sql
ALTER TABLE workers ADD COLUMN company_id INTEGER REFERENCES companies(id);
```

### Modified table: `visitors`

Add `company_id` foreign key:

```sql
ALTER TABLE visitors ADD COLUMN company_id INTEGER REFERENCES companies(id);
```

### Table: `settings`

Remove. Company-level settings (name, logo, welcome message) move into the `companies` table directly. Any future per-company settings can use a `company_settings` table if needed.

## Auth Flows

### Super Admin

- Same pattern as current admin auth: env var `SUPER_ADMIN_PASSWORD`, SHA-256 hashed cookie.
- Rename current env var from `ADMIN_PASSWORD` to `SUPER_ADMIN_PASSWORD`.
- Middleware protects `/super-admin/dashboard` routes.

### Company Admin (Microsoft SSO)

- Use `next-auth` with the Azure AD / Microsoft Entra ID provider.
- Required env vars: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` (set to `common` for multi-tenant).
- On sign-in callback: extract email domain, query `companies` table for matching `domain`. If found, allow access and store `company_id` in the session. If no match, deny with "Company not registered" message.
- Session includes: `user.email`, `user.name`, `user.companyId`, `user.companyName`.

### Visitor Check-in

- No authentication. `/c/[slug]` is fully public.
- Slug looked up in `companies` table. 404 if not found.

## Routes

### Super Admin Routes

- `GET /super-admin` — Login page (password form)
- `POST /api/super-admin/auth` — Authenticate, set cookie
- `GET /super-admin/dashboard` — Company management CRUD
- `GET /api/super-admin/companies` — List all companies
- `POST /api/super-admin/companies` — Create company
- `PUT /api/super-admin/companies` — Update company
- `DELETE /api/super-admin/companies?id=X` — Delete company

### Company Admin Routes

- `GET /admin` — Microsoft SSO login (next-auth sign-in page)
- `GET /admin/dashboard` — Company dashboard (workers, visitor log, settings)
- `GET /api/workers?companyId=X` — List workers (scoped)
- `POST /api/workers` — Add worker (includes companyId from session)
- `PUT /api/workers` — Update worker
- `DELETE /api/workers?id=X` — Delete worker
- `GET /api/visitors?companyId=X&date=Y` — List visitors (scoped)
- `GET /api/settings?companyId=X` — Get company settings
- `PUT /api/settings` — Update company settings

### Visitor Routes

- `GET /c/[slug]` — Public check-in page with company branding
- `POST /api/checkin` — Submit check-in (includes company_id from slug lookup)
- `GET /badge/[id]` — Visitor badge (unchanged, visitor ID is globally unique)

## Middleware

```
/super-admin/dashboard/*  → check super_admin_token cookie
/admin/dashboard/*        → check next-auth session, verify companyId exists
/api/super-admin/*        → check super_admin_token cookie
/api/workers, /api/visitors, /api/settings → check next-auth session, enforce companyId scoping
```

## Super Admin Dashboard UI

Single page at `/super-admin/dashboard`:

- Table listing all companies (name, slug, domain, created date)
- "Add Company" form: name, slug (auto-generated from name), domain, logo URL, welcome message
- Edit/delete actions per row
- Click company name to view their visitor log (read-only)

## Company Admin Dashboard UI

Reuse the existing dashboard design, scoped by `companyId` from session:

- **Visitor Log tab** — same as current, filtered by company_id
- **Workers tab** — same as current, filtered by company_id
- **Settings tab** — edit company name, logo, welcome message (writes to `companies` table)

## Visitor Check-in Page (`/c/[slug]`)

Same as current home page but:

- Looks up company by slug
- Displays that company's branding (name, logo, welcome message)
- Worker dropdown shows only that company's workers
- Check-in POST includes `company_id`

## Home Page (`/`)

Redirect to `/admin` (Microsoft SSO login) or show a simple landing with links to `/admin` and `/super-admin`.

## Dependencies

- `next-auth` — OAuth/SSO framework
- `@auth/core` — next-auth v5 core (App Router compatible)

No other new dependencies needed. `@vercel/postgres` and `resend` remain.

## Environment Variables

New:
- `SUPER_ADMIN_PASSWORD` — replaces `ADMIN_PASSWORD`
- `AZURE_AD_CLIENT_ID` — Microsoft app registration client ID
- `AZURE_AD_CLIENT_SECRET` — Microsoft app registration client secret
- `AZURE_AD_TENANT_ID` — set to `common` for multi-tenant
- `NEXTAUTH_SECRET` — next-auth session encryption key
- `NEXTAUTH_URL` — canonical app URL

Removed:
- `ADMIN_PASSWORD` — renamed to `SUPER_ADMIN_PASSWORD`

## Migration Path

1. Add `companies` table
2. Add `company_id` to `workers` and `visitors` tables
3. Migrate existing data: create a default company, assign existing workers/visitors to it
4. Drop `settings` table after migrating values to `companies`
5. Deploy new routes alongside old ones, then remove old routes
