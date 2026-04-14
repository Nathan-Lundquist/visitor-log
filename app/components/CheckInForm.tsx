"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: number;
  name: string;
}

export default function CheckInForm({ workers }: { workers: Worker[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      first_name: form.get("first_name"),
      last_name: form.get("last_name"),
      phone: form.get("phone"),
      worker_id: Number(form.get("worker_id")),
      reason: form.get("reason"),
    };

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/checked-in");
    } else {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-lg";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
          <input name="first_name" required className={inputClass} placeholder="John" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
          <input name="last_name" required className={inputClass} placeholder="Smith" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
        <input name="phone" type="tel" required className={inputClass} placeholder="(555) 123-4567" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Who are you here to see?</label>
        <select name="worker_id" required className={inputClass}>
          <option value="">Select a person</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
        <textarea
          name="reason"
          required
          rows={3}
          className={inputClass}
          placeholder="Meeting, delivery, interview..."
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-lg transition"
      >
        {submitting ? "Checking in..." : "Check In"}
      </button>
    </form>
  );
}
