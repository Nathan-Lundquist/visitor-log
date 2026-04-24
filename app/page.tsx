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

    // Authenticate first
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

    // PCShards users go straight to super admin dashboard
    if (domain === "pcshards.com") {
      router.push("/super-admin/dashboard");
      return;
    }

    // Look up company slug for the choice screen
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

  const btnClass =
    "w-full py-4 rounded-xl border-2 text-lg font-semibold transition";

  // Step 1: Login
  if (step === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">Visitor Log</h1>
          <p className="text-slate-500 text-center mb-8">Sign in to continue</p>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            />
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
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Choose kiosk or admin panel
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Welcome</h1>
        <p className="text-slate-500 text-center mb-6">What would you like to do?</p>

        <button
          onClick={() => router.push(`/c/${companySlug}`)}
          className={`${btnClass} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`}
        >
          Visitor Check-In
        </button>

        <button
          onClick={() => router.push("/admin/dashboard")}
          className={`${btnClass} bg-white hover:bg-slate-50 text-slate-800 border-slate-300`}
        >
          Admin Panel
        </button>
      </div>
    </div>
  );
}
