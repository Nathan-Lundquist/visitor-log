"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CheckedIn() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">You&apos;re Checked In</h1>
        <p className="text-slate-500 text-lg">Someone will be with you shortly.</p>
        <p className="text-slate-400 text-sm mt-8">Returning to check-in in 5 seconds...</p>
      </div>
    </div>
  );
}
