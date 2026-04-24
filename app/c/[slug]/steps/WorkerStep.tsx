"use client";

import { useState } from "react";
import { Company, Worker, CheckInData } from "../types";

export default function WorkerStep({
  company,
  workers,
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  company: Company;
  workers: Worker[];
  data: CheckInData;
  onUpdate: (updates: Partial<CheckInData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(data.worker_id);
  const [search, setSearch] = useState("");

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.title && w.title.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSelect(workerId: number | null, workerName: string | null) {
    setSelected(workerId);
    onUpdate({ worker_id: workerId, worker_name: workerName });
  }

  function handleNext() {
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Who are you here to see?</h2>
        <p className="text-slate-400">Select a person or choose General Visit</p>
      </div>

      {workers.length > 5 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-lg"
        />
      )}

      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        <button
          onClick={() => handleSelect(null, null)}
          className={`w-full text-left px-5 py-4 rounded-xl border-2 text-lg transition active:scale-[0.98] ${
            selected === null
              ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
          style={selected === null ? { borderColor: company.primary_color, backgroundColor: `${company.primary_color}10` } : undefined}
        >
          General Visit
        </button>

        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => handleSelect(w.id, w.name)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-lg transition active:scale-[0.98] ${
              selected === w.id
                ? "border-blue-500 bg-blue-50 font-medium"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            style={selected === w.id ? { borderColor: company.primary_color, backgroundColor: `${company.primary_color}10` } : undefined}
          >
            {w.name}
            {w.title && (
              <span className="text-sm text-slate-400 ml-2">— {w.title}</span>
            )}
          </button>
        ))}
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
          style={{ backgroundColor: company.primary_color }}
          className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95"
        >
          Next
        </button>
      </div>
    </div>
  );
}
