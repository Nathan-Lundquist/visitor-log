"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "choice">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const domain = email.trim().toLowerCase().split("@")[1];
    if (!domain) {
      setError("Please enter a valid email");
      setSubmitting(false);
      return;
    }

    const authRes = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) {
      const data = await authRes.json();
      setError(data.error || "Sign-in failed");
      setSubmitting(false);
      return;
    }

    if (domain === "pcshards.com") {
      router.push("/super-admin/dashboard");
      return;
    }

    const lookupRes = await fetch(`/api/kiosk/lookup?domain=${encodeURIComponent(domain)}`);
    if (lookupRes.ok) {
      const data = await lookupRes.json();
      setCompanySlug(data.slug);
      setStep("choice");
    } else {
      setError("Company not found");
    }
    setSubmitting(false);
  }

  if (step === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Visitor Log</h1>
          <p className="text-slate-400 text-center text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 placeholder:text-slate-400"
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
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/25 hover:shadow-blue-600/30"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">Visitor management by PCShards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Welcome</h1>
        <p className="text-slate-400 text-center text-sm mb-8">What would you like to do?</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/c/${companySlug}`)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition shadow-lg shadow-blue-600/25 hover:shadow-blue-600/30"
          >
            Visitor Check-In
          </button>

          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 text-lg font-semibold rounded-xl transition border-2 border-slate-200 hover:border-slate-300"
          >
            Admin Panel
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">Visitor management by PCShards</p>
      </div>
    </div>
  );
}
