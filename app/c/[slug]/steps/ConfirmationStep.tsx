"use client";

import { useEffect, useState } from "react";
import { Company, CheckInData } from "../types";

export default function ConfirmationStep({
  company,
  data,
  onReset,
}: {
  company: Company;
  data: CheckInData;
  onReset: () => void;
}) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onReset();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onReset]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: `${company.primary_color}15` }}
      >
        <svg className="w-12 h-12" style={{ color: company.primary_color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-slate-800 mb-3">You're Checked In!</h1>
      <p className="text-xl text-slate-500 mb-2">
        Welcome, {data.first_name} {data.last_name}
      </p>
      {data.worker_name && (
        <p className="text-lg text-slate-400">
          {data.worker_name} has been notified of your arrival
        </p>
      )}

      <p className="text-sm text-slate-300 mt-12">
        Returning to welcome screen in {countdown}s
      </p>
    </div>
  );
}
