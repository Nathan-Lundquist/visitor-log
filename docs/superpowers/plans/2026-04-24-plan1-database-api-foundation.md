# Plan 1: Database & API Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add new database tables (agreements, visitor_signatures, visitor_licenses), new columns on existing tables (companies.primary_color, companies.require_license, companies.require_agreement, workers.title), install @vercel/blob for file uploads, create new API routes for license upload, signature upload, agreement management, admin stats, and admin notifications on check-in.

**Architecture:** Extend the existing Vercel Postgres schema with migrations in `lib/db.ts`. Add Vercel Blob for file storage. New API routes follow existing patterns (NextRequest/NextResponse, @vercel/postgres sql tagged templates). Modify existing checkin and workers APIs to support new fields.

**Tech Stack:** Next.js 15, @vercel/postgres, @vercel/blob, Resend

---

### Task 1: Install @vercel/blob and add database migrations

**Files:**
- Modify: `package.json`
- Modify: `lib/db.ts`

- [ ] **Step 1: Install @vercel/blob**

```bash
cd /home/nathan/projects/visitor-log && npm install @vercel/blob
```

- [ ] **Step 2: Add new tables and columns to lib/db.ts**

Add after the existing `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP;` line in `lib/db.ts`:

```typescript
  // New columns on companies
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_license BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS require_agreement BOOLEAN DEFAULT false`;

  // New column on workers
  await sql`ALTER TABLE workers ADD COLUMN IF NOT EXISTS title TEXT`;

  // Agreements table
  await sql`
    CREATE TABLE IF NOT EXISTS agreements (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      filename TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Visitor licenses table
  await sql`
    CREATE TABLE IF NOT EXISTS visitor_licenses (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      captured_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Visitor signatures table
  await sql`
    CREATE TABLE IF NOT EXISTS visitor_signatures (
      id SERIAL PRIMARY KEY,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      agreement_id INTEGER REFERENCES agreements(id) ON DELETE CASCADE,
      signature_url TEXT NOT NULL,
      signed_at TIMESTAMP DEFAULT NOW()
    )
  `;
```

- [ ] **Step 3: Run the migration by hitting the setup endpoint**

```bash
curl -s -X POST https://visit.pcshards.com/api/setup
```

If there's no setup endpoint, trigger migrations by visiting any page that calls `ensureTables()`, or add a one-time call in the server component at `/c/[slug]/page.tsx` which already runs migrations.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/db.ts
git commit -m "feat: add database tables for agreements, licenses, signatures and new company/worker columns"
```

---

### Task 2: Update workers API to support title field

**Files:**
- Modify: `app/api/workers/route.ts`

- [ ] **Step 1: Update GET to include title**

In `app/api/workers/route.ts`, change the GET query from:

```typescript
const result = await sql`SELECT id, name, email FROM workers WHERE company_id = ${Number(companyId)} ORDER BY name`;
```

to:

```typescript
const result = await sql`SELECT id, name, email, title FROM workers WHERE company_id = ${Number(companyId)} ORDER BY name`;
```

- [ ] **Step 2: Update POST to accept title**

Change the POST handler body parsing from:

```typescript
const { name, email } = await req.json();
```

to:

```typescript
const { name, email, title } = await req.json();
```

And change the INSERT from:

```typescript
await sql`INSERT INTO workers (name, email, company_id) VALUES (${name.trim()}, ${email?.trim() || null}, ${session.companyId})`;
```

to:

```typescript
await sql`INSERT INTO workers (name, email, title, company_id) VALUES (${name.trim()}, ${email?.trim() || null}, ${title?.trim() || null}, ${session.companyId})`;
```

- [ ] **Step 3: Update PUT to accept title**

Change the PUT handler body parsing from:

```typescript
const { id, name, email } = await req.json();
```

to:

```typescript
const { id, name, email, title } = await req.json();
```

And change the UPDATE from:

```typescript
await sql`UPDATE workers SET name = ${name.trim()}, email = ${email?.trim() || null} WHERE id = ${id} AND company_id = ${session.companyId}`;
```

to:

```typescript
await sql`UPDATE workers SET name = ${name.trim()}, email = ${email?.trim() || null}, title = ${title?.trim() || null} WHERE id = ${id} AND company_id = ${session.companyId}`;
```

- [ ] **Step 4: Verify with curl**

```bash
curl -s https://visit.pcshards.com/api/workers?companyId=2
```

Expected: each worker object now includes a `title` field (null for existing workers).

- [ ] **Step 5: Commit**

```bash
git add app/api/workers/route.ts
git commit -m "feat: add title field to workers API"
```

---

### Task 3: Update visitors API to include checked_out_at and use LEFT JOIN

**Files:**
- Modify: `app/api/visitors/route.ts`

- [ ] **Step 1: Rewrite the visitors GET handler**

Replace the entire content of `app/api/visitors/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const date = req.nextUrl.searchParams.get("date");
  const range = req.nextUrl.searchParams.get("range"); // "week" or "month"

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  let result;
  if (date) {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)} AND v.checked_in_at::date = ${date}::date
      ORDER BY v.checked_in_at DESC
    `;
  } else if (range === "week") {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
        AND v.checked_in_at >= NOW() - INTERVAL '7 days'
      ORDER BY v.checked_in_at DESC
    `;
  } else if (range === "month") {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
        AND v.checked_in_at >= NOW() - INTERVAL '30 days'
      ORDER BY v.checked_in_at DESC
    `;
  } else {
    result = await sql`
      SELECT v.id, v.first_name, v.last_name, v.phone, v.reason,
             v.checked_in_at, v.checked_out_at,
             w.name AS worker_name,
             vl.photo_url AS license_photo_url
      FROM visitors v
      LEFT JOIN workers w ON w.id = v.worker_id
      LEFT JOIN visitor_licenses vl ON vl.visitor_id = v.id
      WHERE v.company_id = ${Number(companyId)}
      ORDER BY v.checked_in_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json(result.rows);
}
```

Key changes: added `checked_out_at` to SELECT, changed `JOIN` to `LEFT JOIN` (so visitors with no worker still appear), added `range` parameter for week/month filtering, added `LEFT JOIN visitor_licenses` to include `license_photo_url` in response.

- [ ] **Step 2: Commit**

```bash
git add app/api/visitors/route.ts
git commit -m "feat: add checked_out_at, LEFT JOIN, and range filter to visitors API"
```

---

### Task 4: Create admin stats API

**Files:**
- Create: `app/api/admin/stats/route.ts`

- [ ] **Step 1: Create the stats route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/admin/stats
```

Write `app/api/admin/stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const cid = Number(companyId);

  const [checkedInNow, today, thisWeek, workerCount] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at::date = CURRENT_DATE AND checked_out_at IS NULL`,
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at::date = CURRENT_DATE`,
    sql`SELECT COUNT(*) AS count FROM visitors WHERE company_id = ${cid} AND checked_in_at >= NOW() - INTERVAL '7 days'`,
    sql`SELECT COUNT(*) AS count FROM workers WHERE company_id = ${cid}`,
  ]);

  return NextResponse.json({
    checkedInNow: Number(checkedInNow.rows[0].count),
    today: Number(today.rows[0].count),
    thisWeek: Number(thisWeek.rows[0].count),
    workers: Number(workerCount.rows[0].count),
  });
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s https://visit.pcshards.com/api/admin/stats?companyId=2
```

Expected: `{"checkedInNow":0,"today":0,"thisWeek":0,"workers":0}`

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/stats/route.ts
git commit -m "feat: add admin stats API endpoint"
```

---

### Task 5: Create license upload API

**Files:**
- Create: `app/api/kiosk/license/route.ts`

- [ ] **Step 1: Create the license upload route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/kiosk/license
```

Write `app/api/kiosk/license/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const visitorId = formData.get("visitor_id") as string | null;

  if (!file || !visitorId) {
    return NextResponse.json({ error: "file and visitor_id required" }, { status: 400 });
  }

  const blob = await put(`licenses/${visitorId}-${Date.now()}.jpg`, file, {
    access: "public",
  });

  await sql`
    INSERT INTO visitor_licenses (visitor_id, photo_url)
    VALUES (${Number(visitorId)}, ${blob.url})
  `;

  return NextResponse.json({ ok: true, url: blob.url });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/kiosk/license/route.ts
git commit -m "feat: add license photo upload API"
```

---

### Task 6: Create signature upload API

**Files:**
- Create: `app/api/kiosk/signature/route.ts`

- [ ] **Step 1: Create the signature upload route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/kiosk/signature
```

Write `app/api/kiosk/signature/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  const { visitor_id, agreement_id, signature_data } = await req.json();

  if (!visitor_id || !agreement_id || !signature_data) {
    return NextResponse.json({ error: "visitor_id, agreement_id, and signature_data required" }, { status: 400 });
  }

  // signature_data is a base64 data URL like "data:image/png;base64,..."
  const base64 = signature_data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(`signatures/${visitor_id}-${Date.now()}.png`, buffer, {
    access: "public",
    contentType: "image/png",
  });

  await sql`
    INSERT INTO visitor_signatures (visitor_id, agreement_id, signature_url)
    VALUES (${Number(visitor_id)}, ${Number(agreement_id)}, ${blob.url})
  `;

  return NextResponse.json({ ok: true, url: blob.url });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/kiosk/signature/route.ts
git commit -m "feat: add signature upload API"
```

---

### Task 7: Create agreements API

**Files:**
- Create: `app/api/admin/agreements/route.ts`

- [ ] **Step 1: Create the agreements CRUD route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/admin/agreements
```

Write `app/api/admin/agreements/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sql`
    SELECT id, file_url, filename, enabled, created_at, updated_at
    FROM agreements
    WHERE company_id = ${session.companyId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return NextResponse.json(result.rows[0] || null);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const blob = await put(`agreements/${session.companyId}-${Date.now()}.pdf`, file, {
    access: "public",
    contentType: "application/pdf",
  });

  // Delete existing agreement for this company (one active agreement at a time)
  const existing = await sql`SELECT id, file_url FROM agreements WHERE company_id = ${session.companyId}`;
  for (const row of existing.rows) {
    await del(row.file_url).catch(() => {});
    await sql`DELETE FROM agreements WHERE id = ${row.id}`;
  }

  await sql`
    INSERT INTO agreements (company_id, file_url, filename, enabled)
    VALUES (${session.companyId}, ${blob.url}, ${file.name}, true)
  `;

  // Auto-enable require_agreement on the company
  await sql`UPDATE companies SET require_agreement = true WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true, url: blob.url });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enabled } = await req.json();

  await sql`
    UPDATE agreements SET enabled = ${enabled}, updated_at = NOW()
    WHERE company_id = ${session.companyId}
  `;

  await sql`UPDATE companies SET require_agreement = ${enabled} WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await sql`SELECT id, file_url FROM agreements WHERE company_id = ${session.companyId}`;
  for (const row of existing.rows) {
    await del(row.file_url).catch(() => {});
    await sql`DELETE FROM agreements WHERE id = ${row.id}`;
  }

  await sql`UPDATE companies SET require_agreement = false WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/agreements/route.ts
git commit -m "feat: add agreements CRUD API with Vercel Blob storage"
```

---

### Task 8: Create kiosk agreement fetch API

**Files:**
- Create: `app/api/kiosk/agreement/route.ts`

- [ ] **Step 1: Create the agreement fetch route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/kiosk/agreement
```

Write `app/api/kiosk/agreement/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const result = await sql`
    SELECT id, file_url, filename
    FROM agreements
    WHERE company_id = ${Number(companyId)} AND enabled = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json(result.rows[0]);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/kiosk/agreement/route.ts
git commit -m "feat: add kiosk agreement fetch API"
```

---

### Task 9: Create signed agreements viewer API

**Files:**
- Create: `app/api/admin/signatures/route.ts`

- [ ] **Step 1: Create the signatures API**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/admin/signatures
```

Write `app/api/admin/signatures/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visitorId = req.nextUrl.searchParams.get("visitorId");

  if (visitorId) {
    const result = await sql`
      SELECT vs.id, vs.signature_url, vs.signed_at, a.filename
      FROM visitor_signatures vs
      JOIN agreements a ON a.id = vs.agreement_id
      WHERE vs.visitor_id = ${Number(visitorId)}
      ORDER BY vs.signed_at DESC
    `;
    return NextResponse.json(result.rows);
  }

  // List all signatures for this company's agreement
  const result = await sql`
    SELECT vs.id, vs.signature_url, vs.signed_at, a.filename,
           v.first_name, v.last_name
    FROM visitor_signatures vs
    JOIN agreements a ON a.id = vs.agreement_id
    JOIN visitors v ON v.id = vs.visitor_id
    WHERE a.company_id = ${session.companyId}
    ORDER BY vs.signed_at DESC
    LIMIT 100
  `;
  return NextResponse.json(result.rows);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/signatures/route.ts
git commit -m "feat: add signed agreements viewer API"
```

---

### Task 10: Create logo upload API

**Files:**
- Create: `app/api/admin/logo/route.ts`

- [ ] **Step 1: Create the logo upload route**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/api/admin/logo
```

Write `app/api/admin/logo/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { getAdminSession } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }

  const blob = await put(`logos/${session.companyId}-${Date.now()}.${file.name.split(".").pop()}`, file, {
    access: "public",
  });

  await sql`UPDATE companies SET logo_url = ${blob.url} WHERE id = ${session.companyId}`;

  return NextResponse.json({ ok: true, url: blob.url });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/logo/route.ts
git commit -m "feat: add logo upload API"
```

---

### Task 11: Update checkin API with admin notifications and license/signature support

**Files:**
- Modify: `app/api/checkin/route.ts`
- Modify: `lib/email.ts`

- [ ] **Step 1: Read lib/email.ts to understand current email implementation**

```bash
cat /home/nathan/projects/visitor-log/lib/email.ts
```

- [ ] **Step 2: Add notifyAdmins function to lib/email.ts**

Add this function to `lib/email.ts` (after the existing `notifyWorker` function):

```typescript
export async function notifyAdmins({
  adminEmails,
  visitorName,
  phone,
  reason,
  workerName,
  time,
  companyName,
}: {
  adminEmails: string[];
  visitorName: string;
  phone: string;
  reason: string;
  workerName: string | null;
  time: string;
  companyName: string;
}) {
  if (adminEmails.length === 0) return;

  const resend = getResendClient();
  if (!resend) return;

  const visiting = workerName || "General Visit";

  await resend.emails.send({
    from: `${companyName} Visitor Log <onboarding@resend.dev>`,
    to: adminEmails,
    subject: `Visitor Check-In: ${visitorName}`,
    html: `
      <h2>New Visitor Check-In</h2>
      <p><strong>${visitorName}</strong> has checked in at ${companyName}.</p>
      <ul>
        <li><strong>Visiting:</strong> ${visiting}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Reason:</strong> ${reason}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
    `,
  });
}
```

Note: You may need to check the existing code for a `getResendClient` helper. If the existing code creates the Resend client inline, extract it to a shared helper first, or instantiate it inline in this function the same way.

- [ ] **Step 3: Update checkin route to send admin notifications**

In `app/api/checkin/route.ts`, add this import at the top:

```typescript
import { notifyWorker, notifyAdmins } from "@/lib/email";
```

Then after the existing worker notification block (after the `notifyWorker({...}).catch(() => {});` call), add:

```typescript
  // Notify all company admins
  const adminsResult = await sql`SELECT email FROM admins WHERE company_id = ${company_id}`;
  const adminEmails = adminsResult.rows.map((r: { email: string }) => r.email);

  if (adminEmails.length > 0) {
    const companyResult2 = worker?.email ? null : await sql`SELECT name FROM companies WHERE id = ${company_id}`;
    const cName = worker?.email ? companyName : (companyResult2?.rows[0]?.name || "Visitor Log");

    notifyAdmins({
      adminEmails,
      visitorName: `${first_name} ${last_name}`,
      phone,
      reason,
      workerName: worker?.name || null,
      time: new Date(visitor.checked_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      companyName: cName,
    }).catch(() => {});
  }
```

Note: The existing code already fetches `companyName` for the worker notification. Reuse that variable if the worker notification block ran; otherwise fetch it for the admin notification.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkin/route.ts lib/email.ts
git commit -m "feat: add admin email notifications on visitor check-in"
```

---

### Task 12: Update company server component to pass new fields

**Files:**
- Modify: `app/c/[slug]/page.tsx`

- [ ] **Step 1: Update the company query to include new fields**

In `app/c/[slug]/page.tsx`, change the company SELECT from:

```typescript
const companyResult = await sql`SELECT id, name, slug, logo_url, welcome_message FROM companies WHERE slug = ${slug}`;
```

to:

```typescript
const companyResult = await sql`SELECT id, name, slug, logo_url, welcome_message, primary_color, require_license, require_agreement FROM companies WHERE slug = ${slug}`;
```

- [ ] **Step 2: Update the workers query to include title**

Change:

```typescript
const workersResult = await sql`SELECT id, name FROM workers WHERE company_id = ${company.id} ORDER BY name`;
const workers = workersResult.rows as { id: number; name: string }[];
```

to:

```typescript
const workersResult = await sql`SELECT id, name, title FROM workers WHERE company_id = ${company.id} ORDER BY name`;
const workers = workersResult.rows as { id: number; name: string; title: string | null }[];
```

- [ ] **Step 3: Update the KioskPage props to include new company fields**

Change the KioskPage component call from:

```typescript
<KioskPage
  company={{ id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url, welcome_message: company.welcome_message }}
  workers={workers}
/>
```

to:

```typescript
<KioskPage
  company={{
    id: company.id,
    name: company.name,
    slug: company.slug,
    logo_url: company.logo_url,
    welcome_message: company.welcome_message,
    primary_color: company.primary_color || "#3b82f6",
    require_license: company.require_license || false,
    require_agreement: company.require_agreement || false,
  }}
  workers={workers}
/>
```

- [ ] **Step 4: Remove the inline migration**

Remove this line (it's now handled in `lib/db.ts`):

```typescript
await sql`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP`.catch(() => {});
```

- [ ] **Step 5: Commit**

```bash
git add app/c/[slug]/page.tsx
git commit -m "feat: pass new company and worker fields to kiosk page"
```

---

### Task 13: Deploy and verify

- [ ] **Step 1: Deploy to Vercel**

```bash
cd /home/nathan/projects/visitor-log && vercel --prod --yes
```

- [ ] **Step 2: Verify new APIs work**

```bash
# Stats API
curl -s https://visit.pcshards.com/api/admin/stats?companyId=2

# Workers with title
curl -s https://visit.pcshards.com/api/workers?companyId=2

# Agreement fetch (should return null for now)
curl -s https://visit.pcshards.com/api/kiosk/agreement?companyId=2
```

- [ ] **Step 3: Commit any fixes if needed**
