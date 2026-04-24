"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: number;
  name: string;
}

interface Visitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
  worker_name: string | null;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
}

export default function KioskPage({ company, workers }: { company: Company; workers: Worker[] }) {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loadVisitors = useCallback(async () => {
    const res = await fetch(`/api/kiosk/visitors?companyId=${company.id}`);
    if (res.ok) setVisitors(await res.json());
  }, [company.id]);

  useEffect(() => {
    loadVisitors();
    const interval = setInterval(loadVisitors, 15000);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      first_name: form.get("first_name"),
      last_name: form.get("last_name"),
      phone: form.get("phone"),
      worker_id: form.get("worker_id") ? Number(form.get("worker_id")) || null : null,
      reason: form.get("reason"),
      company_id: company.id,
    };

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      loadVisitors();
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  async function handleCheckout(visitorId: number) {
    await fetch("/api/kiosk/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId }),
    });
    loadVisitors();
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const checkedIn = visitors.filter((v) => !v.checked_out_at);
  const checkedOut = visitors.filter((v) => v.checked_out_at);

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-lg";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side: Check-in form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-4 object-contain" />
            )}
            <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500 mt-1">{company.welcome_message || "Visitor Check-In"}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center font-medium">
                Checked in successfully!
              </div>
            )}

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
                <select name="worker_id" className={inputClass}>
                  <option value="">General Visit</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
                <textarea name="reason" required rows={3} className={inputClass} placeholder="Meeting, delivery, interview..." />
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
          </div>
        </div>
      </div>

      {/* Right side: Visitor log */}
      <div className="lg:w-1/2 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Today&apos;s Visitors</h2>
          <p className="text-slate-500 text-sm mb-6">{checkedIn.length} currently checked in</p>

          {/* Currently checked in */}
          {checkedIn.length === 0 && checkedOut.length === 0 && (
            <p className="text-slate-400 text-center py-12">No visitors yet today</p>
          )}

          {checkedIn.length > 0 && (
            <div className="space-y-3 mb-8">
              {checkedIn.map((v) => (
                <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{v.first_name} {v.last_name}</p>
                    <p className="text-sm text-slate-500">
                      {v.worker_name ? `Visiting ${v.worker_name}` : "General Visit"} &middot; {formatTime(v.checked_in_at)}
                    </p>
                    <p className="text-sm text-slate-400">{v.reason}</p>
                  </div>
                  <button
                    onClick={() => handleCheckout(v.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition whitespace-nowrap"
                  >
                    Check Out
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Already checked out */}
          {checkedOut.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Checked Out</h3>
              <div className="space-y-2">
                {checkedOut.map((v) => (
                  <div key={v.id} className="bg-white/60 rounded-xl border border-slate-100 p-4 opacity-60">
                    <p className="font-medium text-slate-600">{v.first_name} {v.last_name}</p>
                    <p className="text-sm text-slate-400">
                      In {formatTime(v.checked_in_at)} &middot; Out {formatTime(v.checked_out_at!)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
