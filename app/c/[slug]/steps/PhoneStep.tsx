"use client";

import { useState } from "react";
import { StepProps } from "../types";

export default function PhoneStep({ company, data, onUpdate, onNext, onBack }: StepProps) {
  const [phone, setPhone] = useState(data.phone);

  function handleNext() {
    if (!phone.trim()) return;
    onUpdate({ phone: phone.trim() });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Phone Number</h2>
        <p className="text-slate-400">So we can reach you if needed</p>
      </div>

      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 123-4567"
        autoFocus
        className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-xl"
      />

      <div className="flex gap-4 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!phone.trim()}
          style={{ backgroundColor: phone.trim() ? company.primary_color : undefined }}
          className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95 disabled:bg-slate-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}
