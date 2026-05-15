"use client";

import { useState, useEffect, useCallback } from "react";
import { Company, Worker } from "./types";

interface CheckedInVisitor {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  worker_name: string | null;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
  us_citizen: boolean | null;
  company_name: string | null;
  badge_number: string | null;
}

const REASONS = ["Meeting", "Delivery", "Interview", "Contractor", "Other"];

export default function KioskWizard({
  company,
  workers,
}: {
  company: Company;
  workers: Worker[];
  agreement: { id: number; file_url: string; filename: string } | null;
}) {
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [usCitizen, setUsCitizen] = useState<boolean | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Sign-out table state
  const [visitors, setVisitors] = useState<CheckedInVisitor[]>([]);

  const loadVisitors = useCallback(async () => {
    try {
      const res = await fetch(`/api/kiosk/visitors?companyId=${company.id}`);
      if (res.ok) setVisitors(await res.json());
    } catch {
      // ignore
    }
  }, [company.id]);

  useEffect(() => {
    loadVisitors();
    const interval = setInterval(loadVisitors, 10_000);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setWorkerId(null);
    setReason("");
    setCustomReason("");
    setUsCitizen(null);
    setCompanyName("");
    setBadgeNumber("");
    setError("");
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !finalReason) {
      setError("Please fill out all required fields");
      return;
    }
    if (usCitizen === null) {
      setError("Please answer the US citizen question");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          worker_id: workerId,
          reason: finalReason,
          company_id: company.id,
          us_citizen: usCitizen,
          company_name: companyName.trim() || null,
          badge_number: badgeNumber.trim() || null,
        }),
      });
      if (!res.ok) {
        setError("Check-in failed. Please try again.");
        return;
      }
      setSuccess(true);
      loadVisitors();
      setTimeout(() => resetForm(), 8000);
    } catch {
      setError("Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkOut(visitorId: number) {
    await fetch("/api/kiosk/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId, company_id: company.id }),
    });
    loadVisitors();
  }

  const checkedIn = visitors.filter((v) => !v.checked_out_at);

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 text-lg";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="px-6 py-4 text-white shadow-sm"
        style={{ backgroundColor: company.primary_color }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-10 rounded-lg object-contain bg-white/20 p-1"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">
              {company.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold">{company.name}</h1>
            <p className="text-sm opacity-80">
              {company.welcome_message || "Visitor Check-In"}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Check-in form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {success ? (
            <div className="flex flex-col items-center text-center py-10">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: `${company.primary_color}15` }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: company.primary_color }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                You&apos;re Checked In!
              </h2>
              <p className="text-lg text-slate-500">
                Welcome, {firstName} {lastName}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
                Visitor Sign In
              </h2>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                  required
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className={inputClass}
                />
              </div>

              {/* Who are you here to see */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Who are you here to see?
                </label>
                <select
                  value={workerId ?? ""}
                  onChange={(e) =>
                    setWorkerId(e.target.value ? Number(e.target.value) : null)
                  }
                  className={inputClass}
                >
                  <option value="">General Visit</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.title ? ` — ${w.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Reason for Visit *
                </label>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition"
                      style={
                        reason === r
                          ? {
                              borderColor: company.primary_color,
                              backgroundColor: `${company.primary_color}10`,
                              color: company.primary_color,
                            }
                          : {
                              borderColor: "#e2e8f0",
                              backgroundColor: "white",
                              color: "#475569",
                            }
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {reason === "Other" && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please specify"
                    className={`${inputClass} mt-3`}
                  />
                )}
              </div>

              {/* US Citizen */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Are you a US citizen? *
                </label>
                <div className="flex gap-3">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setUsCitizen(val)}
                      className="flex-1 py-3 rounded-xl border-2 text-base font-semibold transition"
                      style={
                        usCitizen === val
                          ? {
                              borderColor: company.primary_color,
                              backgroundColor: `${company.primary_color}10`,
                              color: company.primary_color,
                            }
                          : {
                              borderColor: "#e2e8f0",
                              backgroundColor: "white",
                              color: "#475569",
                            }
                      }
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Number */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Badge Number
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="Assigned badge #"
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: company.primary_color }}
                className="w-full py-4 text-white text-lg font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg"
              >
                {submitting ? "Checking in..." : "Sign In"}
              </button>
            </form>
          )}
        </div>

        {/* Sign-out table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Sign Out
            {checkedIn.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {checkedIn.length} checked in
              </span>
            )}
          </h2>

          {checkedIn.length === 0 ? (
            <p className="text-slate-400 text-center py-6">
              No visitors currently checked in
            </p>
          ) : (
            <div className="space-y-2">
              {checkedIn.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {v.first_name} {v.last_name}
                      </p>
                      {v.us_citizen === false && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                          Non-Citizen
                        </span>
                      )}
                      {v.us_citizen === true && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          US Citizen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {new Date(v.checked_in_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {v.company_name ? ` · ${v.company_name}` : ""}
                      {v.worker_name ? ` · Visiting ${v.worker_name}` : ""}
                      {v.reason ? ` · ${v.reason}` : ""}
                      {v.badge_number ? ` · Badge #${v.badge_number}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => checkOut(v.id)}
                    className="px-5 py-2.5 text-sm font-semibold rounded-xl transition"
                    style={{
                      backgroundColor: `${company.primary_color}10`,
                      color: company.primary_color,
                      border: `1px solid ${company.primary_color}30`,
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-300 mt-4">
            Auto-refreshes every 10 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
