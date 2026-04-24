# Visitor Log SaaS Redesign

**Goal:** Redesign the visitor check-in system from a basic form-based app into a modern, tablet-first SaaS product that PCShards provides to enterprise clients.

**Architecture:** Multi-tenant Next.js 15 app with three tiers — public kiosk (card-stack wizard), company admin dashboard (4-tab management console), and super admin (simple internal CRUD). Tablet-first kiosk with touch-optimized UI. Company branding with logo, welcome message, and primary color. Configurable check-in steps per company.

**Tech Stack:** Next.js 15, React 19, Vercel Postgres, Tailwind CSS, Resend (email), Web Crypto API (SHA-256 auth)

---

## 1. Kiosk Check-In Flow (`/c/[slug]`)

### Card-Stack Wizard

The kiosk presents a full-screen, step-by-step wizard optimized for tablet touch input. Each step occupies the full screen as a card. When the visitor advances, the completed card collapses into a thin summary bar at the top, and the next card slides up from the bottom. Previous answers remain visible as collapsed cards. Tapping a collapsed card or pressing Back expands it for editing.

### Steps (in order)

1. **Welcome** — Company logo (from `companies.logo_url`), company name, welcome message, large "Tap to Check In" button. Themed with company's `primary_color`.

2. **Your Name** — First name and last name in two large input fields. Touch-friendly, minimum 48px tap targets.

3. **Phone Number** — Single phone input field.

4. **Who Are You Here To See?** — Scrollable list of workers (from `workers` table filtered by `company_id`). Each entry shows worker name and title/department. "General Visit" option at top for visitors not seeing a specific person. Tapping a name selects it (highlighted border). Optional search/filter at top for companies with many workers.

5. **Reason for Visit** — Preset reason buttons: Meeting, Delivery, Interview, Contractor, Other. Tapping "Other" reveals a text input for custom reason. Only one selection allowed.

6. **License Photo** *(conditional — enabled per company via `companies.enabled_steps`)* — Uses device camera via `getUserMedia` API to capture a photo of the visitor's driver's license or ID. Shows camera viewfinder with a "Capture" button. After capture, shows preview with "Retake" and "Continue" options. Photo uploaded to blob storage, URL saved to `visitor_licenses` table.

7. **Sign Agreement** *(conditional — enabled per company, requires uploaded PDF in `agreements` table)* — Displays the company's uploaded NDA/agreement PDF in an embedded viewer. Below the PDF, a signature pad (canvas-based touch drawing). Visitor draws their signature and taps "I Agree & Sign". Signature image and timestamp saved to `visitor_signatures` table.

8. **Confirmation** — Large green checkmark, "You're checked in!" message, visitor name displayed. Auto-resets to Welcome screen after 15 seconds of inactivity. No manual navigation needed.

### Progress Indicator

Progress dots at the top of the screen, one per active step (conditional steps excluded from count if disabled). Filled dots for completed steps, outlined for remaining. Dots themed with company's `primary_color`.

### Company Branding

- Company logo displayed in the header area on every step
- `primary_color` applied to: progress dots, Next/Continue buttons, selected option borders, Welcome screen button
- Welcome message shown on the Welcome step

### Notifications

On successful check-in:
- **Host notification:** Email sent to the worker being visited (if worker has email set). Contains visitor name, phone, reason, and check-in time.
- **Admin notification:** Email sent to all admins for that company (`admins` table filtered by `company_id`). Same content as host notification.

Both emails sent via Resend, non-blocking (fire and forget with error swallowing).

---

## 2. Visitor Log Screen (`/c/[slug]/log`)

A dedicated live-view page for front desk staff to monitor who is currently in the building. Separate from the kiosk so the kiosk tablet stays in wizard mode.

### Features

- Shows today's visitors for the company
- Currently checked-in visitors at the top with a "Check Out" button on each row
- Checked-out visitors below in a faded section with in/out times
- Visitor details: name, phone, who they're visiting, reason, check-in time
- Auto-refreshes every 10 seconds
- Accessible via direct URL or link from admin dashboard

---

## 3. Company Admin Dashboard (`/admin/dashboard`)

A 4-tab management console for company administrators. Top navigation bar shows company logo/name, tab links, and logged-in user email.

### 3.1 Visitors Tab (default)

**Stats bar** — Four metric cards across the top:
- Checked In Now (count of visitors with `checked_in_at` today and `checked_out_at IS NULL`)
- Today (total visitors today)
- This Week (total visitors this week)
- Workers (total worker count for company)

**Visitor table** — Sortable, searchable table with columns:
- Visitor (full name + phone)
- Visiting (worker name or "General Visit")
- Reason
- In (check-in time)
- Out (check-out time, or green "In" badge if still checked in)
- License (clickable "View" link to see license photo, if captured)

**Controls:**
- Search input (filters by visitor name)
- Date range picker (Today, This Week, This Month, custom date)
- Export CSV button

### 3.2 Workers Tab

CRUD interface for managing workers who appear in the kiosk "Who to see" step.

**Worker fields:**
- Name (required)
- Email (optional — used for visit notification emails)
- Title/Department (optional — displayed next to name in kiosk)

**Interface:** Table listing all workers with Edit and Delete actions. Add Worker form above or in a modal.

### 3.3 Agreements Tab

Manage the company's NDA/agreement document for the kiosk signing step.

**Features:**
- Upload PDF button — accepts a single PDF file, stores in blob storage, saves URL to `agreements` table
- Toggle switch — enable/disable agreement signing in the kiosk flow
- Current agreement display — shows filename, upload date, and a preview/download link
- Replace agreement — upload a new PDF to replace the existing one
- Signed agreements list — table of visitors who signed, with date/time and a link to view/download the signed copy (PDF + signature overlay)

### 3.4 Settings Tab

Company branding and kiosk configuration.

**Branding:**
- Company logo — upload image (stored in blob storage, URL saved to `companies.logo_url`)
- Primary color — color picker, saved to `companies.primary_color`, applied to kiosk buttons/accents
- Welcome message — text input, saved to `companies.welcome_message`

**Kiosk Configuration:**
- Toggle: Require license photo (controls whether step 6 appears in wizard)
- Toggle: Require agreement signing (controls whether step 7 appears, grayed out if no PDF uploaded)
- Kiosk URL display — shows the full URL (`https://visit.pcshards.com/c/[slug]`) with a copy button for easy sharing

---

## 4. Login Flow (`/`)

### Login Screen

Centered card with:
- App title "Visitor Log"
- Subtitle "Sign in to continue"
- Email input
- Password input
- Sign In button (blue)

### Post-Login Routing

Authentication via `/api/admin/auth` (existing SHA-256 email+password flow).

- **PCShards domain** (`@pcshards.com`) → redirect to `/super-admin/dashboard`
- **Any other company domain** → choice screen with two options:
  - "Open Kiosk" — opens `/c/[slug]` (the card-stack wizard for setting up a tablet)
  - "Admin Panel" — navigates to `/admin/dashboard`

### Auth unchanged

Session management stays as-is: base64-encoded JSON in `admin_session` httpOnly cookie. SHA-256 password hashing with `visitor-log-admin:` prefix. Middleware protects super admin routes by checking for `@pcshards.com` domain in session.

---

## 5. Super Admin Dashboard (`/super-admin/dashboard`)

No changes. Stays as-is — simple company and admin CRUD for internal PCShards use.

- Companies tab: add/edit/delete companies (name, slug, domain, logo, welcome message)
- Admin Users tab: add/remove admin accounts per company
- Protected by middleware (requires `@pcshards.com` session)

---

## 6. Database Changes

### New Tables

**`agreements`**
- `id` SERIAL PRIMARY KEY
- `company_id` INTEGER REFERENCES companies(id) ON DELETE CASCADE
- `file_url` TEXT NOT NULL — URL to uploaded PDF in blob storage
- `filename` TEXT NOT NULL — original filename for display
- `enabled` BOOLEAN DEFAULT true — whether this agreement is active in the kiosk
- `created_at` TIMESTAMP DEFAULT NOW()
- `updated_at` TIMESTAMP DEFAULT NOW()

**`visitor_signatures`**
- `id` SERIAL PRIMARY KEY
- `visitor_id` INTEGER REFERENCES visitors(id) ON DELETE CASCADE
- `agreement_id` INTEGER REFERENCES agreements(id) ON DELETE CASCADE
- `signature_url` TEXT NOT NULL — URL to signature image in blob storage
- `signed_at` TIMESTAMP DEFAULT NOW()

**`visitor_licenses`**
- `id` SERIAL PRIMARY KEY
- `visitor_id` INTEGER REFERENCES visitors(id) ON DELETE CASCADE
- `photo_url` TEXT NOT NULL — URL to license photo in blob storage
- `captured_at` TIMESTAMP DEFAULT NOW()

### Modified Tables

**`companies`** — add columns:
- `primary_color` TEXT DEFAULT '#3b82f6' — hex color for kiosk branding
- `require_license` BOOLEAN DEFAULT false — enable license photo step
- `require_agreement` BOOLEAN DEFAULT false — enable agreement signing step

**`workers`** — add column:
- `title` TEXT — job title or department, displayed in kiosk worker list

**`visitors`** — already has `checked_out_at` (added previously)

---

## 7. New API Routes

### Kiosk
- `POST /api/kiosk/license` — upload license photo (multipart form, returns URL)
- `POST /api/kiosk/signature` — upload signature image (base64 body, returns URL)
- `GET /api/kiosk/agreement?companyId=N` — get active agreement PDF URL for a company

### Admin
- `GET /api/admin/stats?companyId=N` — visitor stats (checked in now, today, week)
- `GET/POST/DELETE /api/admin/agreements` — CRUD for company agreement PDFs
- `GET /api/admin/signatures?visitorId=N` — get signed agreements for a visitor

### Existing (modified)
- `POST /api/checkin` — add admin email notification, support null worker_id (already done), create visitor_licenses record if license photo provided
- `GET /api/workers` — include `title` field in response
- `POST/PUT /api/workers` — accept `title` field

---

## 8. File Storage

License photos, agreement PDFs, and signature images need blob storage. Options:

**Vercel Blob** — simplest, integrated with Vercel deployment. `@vercel/blob` package. Upload via `put()`, returns public URL. Free tier: 250MB, should be sufficient for initial rollout.

All uploaded files stored via Vercel Blob with URLs saved to the database.

---

## 9. Email Notifications

### On Check-In (existing, extended)

**To host (worker being visited):**
> Subject: Visitor Check-In: John Smith
>
> John Smith has checked in to see you at Brico Welding.
> Phone: (555) 123-4567
> Reason: Meeting
> Time: 9:15 AM

**To admin(s) (new):**
Same content as host email, sent to all admin emails for the company. Query: `SELECT email FROM admins WHERE company_id = $1`.

Both sent via Resend, non-blocking.
