"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<null | "kiosk" | "admin">(null);
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleKiosk(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    router.push(`/c/${slug.trim().toLowerCase()}`);
  }

  async function handleAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Sign-in failed");
      setSubmitting(false);
    }
  }

  const btnClass =
    "w-full py-4 rounded-xl border-2 text-lg font-semibold transition";

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">Visitor Log</h1>
          <p className="text-slate-500 text-center mb-8">Select an option to continue</p>

          <button
            onClick={() => setMode("kiosk")}
            className={`${btnClass} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`}
          >
            Check-In Kiosk
          </button>

          <button
            onClick={() => setMode("admin")}
            className={`${btnClass} bg-white hover:bg-slate-50 text-slate-800 border-slate-300`}
          >
            Admin Login
          </button>
        </div>
      </div>
    );
  }

  if (mode === "kiosk") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <button onClick={() => setMode(null)} className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; Back</button>
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Check-In Kiosk</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Enter your company code</p>
          <form onSubmit={handleKiosk} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Company code (e.g. pcshards)"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Go to Check-In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode(null)} className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; Back</button>
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Admin Login</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Sign in with your company email</p>
        <form onSubmit={handleAdmin} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white font-semibold rounded-lg transition"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
