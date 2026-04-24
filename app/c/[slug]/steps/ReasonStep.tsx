"use client";

import { useState } from "react";
import { StepProps } from "../types";

const PRESETS = ["Meeting", "Delivery", "Interview", "Contractor", "Other"];

export default function ReasonStep({ company, data, onUpdate, onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState(data.reason || "");
  const [custom, setCustom] = useState("");
  const isOther = selected === "Other";
  const reason = isOther ? custom : selected;

  function handleNext() {
    if (!reason.trim()) return;
    onUpdate({ reason: reason.trim() });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Reason for Visit</h2>
        <p className="text-slate-400">What brings you in today?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setSelected(preset)}
            className={`px-5 py-4 rounded-xl border-2 text-lg font-medium transition active:scale-[0.98] ${
              selected === preset
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            style={selected === preset ? { borderColor: company.primary_color, backgroundColor: `${company.primary_color}10` } : undefined}
          >
            {preset}
          </button>
        ))}
      </div>

      {isOther && (
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Describe your visit"
          autoFocus
          className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-xl"
        />
      )}

      <div className="flex gap-4 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!reason.trim()}
          style={{ backgroundColor: reason.trim() ? company.primary_color : undefined }}
          className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95 disabled:bg-slate-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}
