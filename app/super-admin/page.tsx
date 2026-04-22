"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/super-admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/super-admin/dashboard");
    } else {
      setError("Invalid password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Super Admin</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Visitor Log Management</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
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
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
