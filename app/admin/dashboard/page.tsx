"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VisitorsTab from "./tabs/VisitorsTab";
import WorkersTab from "./tabs/WorkersTab";
import AgreementsTab from "./tabs/AgreementsTab";
import SettingsTab from "./tabs/SettingsTab";

interface SessionUser {
  email: string;
  companyId: number;
  companyName: string;
  companySlug: string;
  mustChangePassword?: boolean;
}

interface Stats {
  checkedInNow: number;
  today: number;
  thisWeek: number;
  workers: number;
}

type Tab = "visitors" | "workers" | "agreements" | "settings";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("visitors");
  const [stats, setStats] = useState<Stats>({ checkedInNow: 0, today: 0, thisWeek: 0, workers: 0 });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.companyId) {
          setUser(data.user);
          setLoading(false);
          if (data.user.mustChangePassword) {
            setShowPasswordChange(true);
          }
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    if (user) {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "visitors", label: "Visitors" },
    { id: "workers", label: "Workers" },
    { id: "agreements", label: "Agreements" },
    { id: "settings", label: "Settings" },
  ];

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwNew.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match"); return; }
    setPwSubmitting(true);
    const res = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
    });
    if (res.ok) {
      setShowPasswordChange(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      if (user) setUser({ ...user, mustChangePassword: false });
    } else {
      const data = await res.json();
      setPwError(data.error || "Failed to change password");
    }
    setPwSubmitting(false);
  }

  function handleSignOut() {
    document.cookie = "admin_session=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">{user?.companyName}</h1>
            <div className="hidden sm:flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    tab === t.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">{user?.email}</span>
            <button onClick={handleSignOut} className="text-sm text-slate-500 hover:text-slate-700">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Checked In Now</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.checkedInNow}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Today</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.today}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">This Week</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.thisWeek}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Workers</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.workers}</div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex gap-2 mb-6 sm:hidden overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                tab === t.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "visitors" && user && <VisitorsTab companyId={user.companyId} />}
        {tab === "workers" && user && <WorkersTab companyId={user.companyId} />}
        {tab === "agreements" && <AgreementsTab />}
        {tab === "settings" && <SettingsTab />}
      </div>

      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Change Password</h2>
            <p className="text-sm text-slate-500 mb-6">
              {user?.mustChangePassword
                ? "You must change your password before continuing."
                : "Enter your current password and choose a new one."}
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Current Password</label>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />
              </div>
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{pwError}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pwSubmitting}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white font-semibold rounded-lg transition"
                >
                  {pwSubmitting ? "Changing..." : "Change Password"}
                </button>
                {!user?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="px-4 py-3 text-slate-500 hover:text-slate-700 font-medium rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
