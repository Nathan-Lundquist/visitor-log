# Plan 4: Visitor Log Screen & Admin Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dedicated visitor log screen at `/c/[slug]/log` for front desk staff to monitor today's visitors and check them out, and add admin email notifications on check-in.

**Architecture:** New page route `/c/[slug]/log` with a server component that fetches company data and a client component that auto-refreshes the visitor list every 10 seconds. Admin notifications added to the existing check-in API via a new `notifyAdmins` function in `lib/email.ts`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, @vercel/postgres, Resend

**Depends on:** Plan 1 (database & API foundation) must be completed first.

---

## File Structure

```
app/c/[slug]/log/
├── page.tsx                    # Server component — fetch company, render VisitorLog
├── VisitorLog.tsx              # Client component — auto-refresh, checkout buttons
lib/
├── email.ts                    # Add notifyAdmins function
app/api/checkin/
├── route.ts                    # Add admin notification after check-in
```

---

### Task 1: Create the Visitor Log server component

**Files:**
- Create: `app/c/[slug]/log/page.tsx`

- [ ] **Step 1: Create the log directory**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/c/\[slug\]/log
```

- [ ] **Step 2: Write the server component**

Write `app/c/[slug]/log/page.tsx`:

```typescript
import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import VisitorLog from "./VisitorLog";

export default async function VisitorLogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const companyResult = await sql`
    SELECT id, name, slug, logo_url, primary_color
    FROM companies WHERE slug = ${slug}
  `;

  if (companyResult.rows.length === 0) {
    notFound();
  }

  const company = companyResult.rows[0];

  return (
    <VisitorLog
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logo_url,
        primaryColor: company.primary_color || "#3b82f6",
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/c/\[slug\]/log/page.tsx
git commit -m "feat: add visitor log server component at /c/[slug]/log"
```

---

### Task 2: Create the VisitorLog client component

**Files:**
- Create: `app/c/[slug]/log/VisitorLog.tsx`

- [ ] **Step 1: Write the VisitorLog component**

Write `app/c/[slug]/log/VisitorLog.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";

interface Visitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  worker_name: string | null;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
}

interface CompanyInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
}

export default function VisitorLog({ company }: { company: CompanyInfo }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [now, setNow] = useState(new Date());

  const loadVisitors = useCallback(async () => {
    const res = await fetch(`/api/kiosk/visitors?companyId=${company.id}`);
    if (res.ok) {
      setVisitors(await res.json());
      setNow(new Date());
    }
  }, [company.id]);

  useEffect(() => {
    loadVisitors();
    const interval = setInterval(loadVisitors, 10_000);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  async function checkOut(visitorId: number) {
    await fetch("/api/kiosk/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId }),
    });
    loadVisitors();
  }

  const checkedIn = visitors.filter((v) => !v.checked_out_at);
  const checkedOut = visitors.filter((v) => v.checked_out_at);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="px-6 py-4 text-white"
        style={{ backgroundColor: company.primaryColor }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-8 h-8 rounded-lg object-contain bg-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                {company.name.charAt(0)}
              </div>
            )}
            <h1 className="text-lg font-bold">{company.name} — Visitor Log</h1>
          </div>
          <div className="text-sm opacity-80">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Currently checked in */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Currently Checked In ({checkedIn.length})
          </h2>
          {checkedIn.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              No visitors currently checked in
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">In</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {checkedIn.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {v.first_name} {v.last_name}
                        </div>
                        <div className="text-xs text-slate-400">{v.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.worker_name || "General Visit"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_in_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => checkOut(v.id)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg transition"
                          style={{
                            backgroundColor: company.primaryColor + "15",
                            color: company.primaryColor,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              company.primaryColor + "25";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              company.primaryColor + "15";
                          }}
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Checked out today */}
        {checkedOut.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Checked Out ({checkedOut.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Visiting</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Reason</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">In</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedOut.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {v.first_name} {v.last_name}
                        </div>
                        <div className="text-xs text-slate-400">{v.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.worker_name || "General Visit"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_in_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(v.checked_out_at!).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-center text-xs text-slate-400">
          Auto-refreshes every 10 seconds &middot; Last updated{" "}
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/c/\[slug\]/log/VisitorLog.tsx
git commit -m "feat: add VisitorLog client component with auto-refresh and checkout"
```

---

### Task 3: Add notifyAdmins function to email library

**Files:**
- Modify: `lib/email.ts`

- [ ] **Step 1: Add the notifyAdmins function**

Add this after the existing `notifyWorker` function at the end of `lib/email.ts`:

```typescript
interface AdminNotification {
  adminEmails: string[];
  visitorName: string;
  phone: string;
  reason: string;
  workerName: string | null;
  time: string;
  companyName: string;
}

export async function notifyAdmins(data: AdminNotification) {
  if (!resend || data.adminEmails.length === 0) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";
  const visiting = data.workerName || "General Visit";

  await resend.emails.send({
    from: fromAddress,
    to: data.adminEmails,
    subject: `Visitor Check-In: ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <h2 style="margin-bottom: 4px;">New Visitor Check-In — ${data.companyName}</h2>
        <p><strong>${data.visitorName}</strong> has checked in at ${data.companyName}.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Visiting</td><td>${visiting}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
        </table>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add notifyAdmins email function"
```

---

### Task 4: Wire admin notifications into check-in API

**Files:**
- Modify: `app/api/checkin/route.ts`

- [ ] **Step 1: Add notifyAdmins import**

Change the import at the top of `app/api/checkin/route.ts` from:

```typescript
import { notifyWorker } from "@/lib/email";
```

to:

```typescript
import { notifyWorker, notifyAdmins } from "@/lib/email";
```

- [ ] **Step 2: Add admin notification after the worker notification block**

After the closing `}` of the `if (worker?.email)` block (line 48), and before the final `return` statement, add:

```typescript
  // Notify all company admins
  const adminsResult = await sql`SELECT email FROM admins WHERE company_id = ${company_id}`;
  const adminEmails = adminsResult.rows.map((r: { email: string }) => r.email);

  if (adminEmails.length > 0) {
    // Reuse companyName if already fetched for worker notification, otherwise fetch it
    let companyName: string;
    if (worker?.email) {
      // Already fetched above in the worker notification block
      const companyResult2 = await sql`SELECT name FROM companies WHERE id = ${company_id}`;
      companyName = companyResult2.rows[0]?.name || "Visitor Log";
    } else {
      const companyResult2 = await sql`SELECT name FROM companies WHERE id = ${company_id}`;
      companyName = companyResult2.rows[0]?.name || "Visitor Log";
    }

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
      companyName,
    }).catch(() => {});
  }
```

Note: Both branches fetch companyName the same way since we can't guarantee the worker notification block ran. A cleaner approach is to always fetch companyName once before both notification blocks. If the implementer wants to refactor, they can move the company fetch before the `if (worker?.email)` block and reuse it for both.

- [ ] **Step 3: Commit**

```bash
git add app/api/checkin/route.ts
git commit -m "feat: send admin email notifications on visitor check-in"
```

---

### Task 5: Deploy and verify

- [ ] **Step 1: Deploy**

```bash
cd /home/nathan/projects/visitor-log && vercel --prod --yes
```

- [ ] **Step 2: Verify the visitor log page**

Open `https://visit.pcshards.com/c/brico-welding/log` in a browser. Verify:
- Header shows company name and primary color
- "Currently Checked In" section is visible (may be empty)
- "Checked Out" section appears when visitors have been checked out
- Auto-refresh indicator shows at the bottom
- Check Out button works on checked-in visitors

- [ ] **Step 3: Verify admin notifications**

Check in a test visitor via the kiosk at `https://visit.pcshards.com/c/brico-welding`. Verify that `h.sova@bricowelding.com` receives an email notification (if Resend is configured with a verified domain; otherwise check Resend dashboard logs).

- [ ] **Step 4: Commit any fixes if needed**
