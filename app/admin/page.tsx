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
