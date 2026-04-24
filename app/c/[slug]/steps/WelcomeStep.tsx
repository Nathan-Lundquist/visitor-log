"use client";

import { Company } from "../types";

export default function WelcomeStep({
  company,
  onNext,
}: {
  company: Company;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      {company.logo_url && (
        <img
          src={company.logo_url}
          alt={company.name}
          className="h-24 mb-6 object-contain"
        />
      )}
      <h1 className="text-4xl font-bold text-slate-800 mb-3">{company.name}</h1>
      <p className="text-xl text-slate-500 mb-12">
        {company.welcome_message || "Visitor Check-In"}
      </p>
      <button
        onClick={onNext}
        style={{ backgroundColor: company.primary_color }}
        className="px-16 py-5 text-white text-2xl font-semibold rounded-2xl shadow-lg hover:opacity-90 transition active:scale-95"
      >
        Tap to Check In
      </button>
    </div>
  );
}
