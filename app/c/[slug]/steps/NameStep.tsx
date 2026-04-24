"use client";

import { useState } from "react";
import { StepProps } from "../types";

export default function NameStep({ company, data, onUpdate, onNext, onBack }: StepProps) {
  const [firstName, setFirstName] = useState(data.first_name);
  const [lastName, setLastName] = useState(data.last_name);

  function handleNext() {
    if (!firstName.trim() || !lastName.trim()) return;
    onUpdate({ first_name: firstName.trim(), last_name: lastName.trim() });
    onNext();
  }

  const inputClass =
    "w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-xl";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">What's your name?</h2>
        <p className="text-slate-400">Enter your first and last name</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          autoFocus
          className={inputClass}
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
          className={inputClass}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!firstName.trim() || !lastName.trim()}
          style={{ backgroundColor: firstName.trim() && lastName.trim() ? company.primary_color : undefined }}
          className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95 disabled:bg-slate-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}
