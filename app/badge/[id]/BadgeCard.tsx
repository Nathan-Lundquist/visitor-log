"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  visitor: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    worker_name: string;
    reason: string;
    checked_in_at: string;
  };
  companyName: string;
  slug: string;
}

export default function BadgeCard({ visitor, companyName, slug }: Props) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push(`/c/${slug}`), 30000);
    return () => clearTimeout(timer);
  }, [router, slug]);

  const date = new Date(visitor.checked_in_at);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
      <div id="badge" className="w-[400px] bg-white border-2 border-slate-300 rounded-xl overflow-hidden print:border-black print:rounded-none">
        <div className="bg-slate-800 text-white text-center py-3">
          <p className="text-xs uppercase tracking-widest opacity-70">{companyName}</p>
          <h1 className="text-2xl font-bold tracking-wide">VISITOR</h1>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">
              {visitor.first_name} {visitor.last_name}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Visiting</span>
              <span className="font-medium text-slate-800">{visitor.worker_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reason</span>
              <span className="font-medium text-slate-800">{visitor.reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-800">
                {date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-800">
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-slate-400">Badge #{visitor.id}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition"
        >
          Print Badge
        </button>
        <button
          onClick={() => router.push(`/c/${slug}`)}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
        >
          Done
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-400 print:hidden">Returning to check-in in 30 seconds...</p>
    </div>
  );
}
