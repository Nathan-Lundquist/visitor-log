"use client";

import { useState, useCallback, useEffect } from "react";
import { Company, Worker, Agreement, CheckInData } from "./types";
import WelcomeStep from "./steps/WelcomeStep";
import NameStep from "./steps/NameStep";
import PhoneStep from "./steps/PhoneStep";
import WorkerStep from "./steps/WorkerStep";
import ReasonStep from "./steps/ReasonStep";
import LicenseStep from "./steps/LicenseStep";
import AgreementStep from "./steps/AgreementStep";
import ConfirmationStep from "./steps/ConfirmationStep";

type StepId = "welcome" | "name" | "phone" | "worker" | "reason" | "license" | "agreement" | "confirmation";

interface StepDef {
  id: StepId;
  label: string;
  summary: (data: CheckInData) => string;
}

const emptyData: CheckInData = {
  first_name: "",
  last_name: "",
  phone: "",
  worker_id: null,
  worker_name: null,
  reason: "",
  license_photo: null,
  signature_data: null,
};

export default function KioskWizard({
  company,
  workers,
  agreement,
}: {
  company: Company;
  workers: Worker[];
  agreement: Agreement | null;
}) {
  const [data, setData] = useState<CheckInData>({ ...emptyData });
  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [submitting, setSubmitting] = useState(false);

  // Build step list based on company config
  const steps: StepDef[] = [
    { id: "welcome", label: "Welcome", summary: () => "" },
    { id: "name", label: "Name", summary: (d) => `${d.first_name} ${d.last_name}` },
    { id: "phone", label: "Phone", summary: (d) => d.phone },
    { id: "worker", label: "Visiting", summary: (d) => d.worker_name || "General Visit" },
    { id: "reason", label: "Reason", summary: (d) => d.reason },
    ...(company.require_license
      ? [{ id: "license" as StepId, label: "ID Photo", summary: () => "Photo captured" }]
      : []),
    ...(company.require_agreement && agreement
      ? [{ id: "agreement" as StepId, label: "Agreement", summary: () => "Signed" }]
      : []),
    { id: "confirmation", label: "Done", summary: () => "" },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  // Steps that show in progress dots (exclude welcome and confirmation)
  const progressSteps = steps.filter((s) => s.id !== "welcome" && s.id !== "confirmation");
  const progressIndex = progressSteps.findIndex((s) => s.id === currentStep);

  function updateData(updates: Partial<CheckInData>) {
    setData((d) => ({ ...d, ...updates }));
  }

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  }

  function goBack() {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  }

  const reset = useCallback(() => {
    setData({ ...emptyData });
    setCurrentStep("welcome");
  }, []);

  // Submit check-in when reaching confirmation
  useEffect(() => {
    if (currentStep !== "confirmation" || submitting) return;
    setSubmitting(true);

    async function submit() {
      try {
        // 1. Create visitor record
        const checkinRes = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            worker_id: data.worker_id,
            reason: data.reason,
            company_id: company.id,
          }),
        });

        if (!checkinRes.ok) return;
        const { id: visitorId } = await checkinRes.json();

        // 2. Upload license photo if captured
        if (data.license_photo) {
          const formData = new FormData();
          formData.append("file", data.license_photo);
          formData.append("visitor_id", String(visitorId));
          await fetch("/api/kiosk/license", { method: "POST", body: formData }).catch(() => {});
        }

        // 3. Upload signature if signed
        if (data.signature_data && agreement) {
          await fetch("/api/kiosk/signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitor_id: visitorId,
              agreement_id: agreement.id,
              signature_data: data.signature_data,
            }),
          }).catch(() => {});
        }
      } catch {
        // Silently fail — visitor is still shown confirmation
      } finally {
        setSubmitting(false);
      }
    }

    submit();
  }, [currentStep]);

  // Collapsed cards for completed steps
  const completedSteps = steps.slice(1, currentIndex).filter((s) => s.id !== "welcome");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Company header */}
      {currentStep !== "welcome" && currentStep !== "confirmation" && (
        <div className="flex items-center justify-center gap-3 pt-6 pb-2">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.name} className="h-10 object-contain" />
          )}
          <span className="text-lg font-bold text-slate-800">{company.name}</span>
        </div>
      )}

      {/* Progress dots */}
      {currentStep !== "welcome" && currentStep !== "confirmation" && (
        <div className="flex justify-center gap-2 py-4">
          {progressSteps.map((s, i) => (
            <div
              key={s.id}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: i <= progressIndex ? company.primary_color : "#e2e8f0",
              }}
            />
          ))}
        </div>
      )}

      {/* Card stack area */}
      <div className="flex-1 flex flex-col justify-end p-6 max-w-lg mx-auto w-full">
        {/* Collapsed previous cards */}
        {completedSteps.map((s) => (
          <div
            key={s.id}
            onClick={() => setCurrentStep(s.id)}
            className="bg-slate-200/60 rounded-t-2xl px-6 py-3 -mb-1 cursor-pointer hover:bg-slate-200 transition text-sm text-slate-500"
            style={{ marginLeft: "8px", marginRight: "8px" }}
          >
            {s.summary(data)}
          </div>
        ))}

        {/* Active card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 relative z-10">
          {currentStep === "welcome" && (
            <WelcomeStep company={company} onNext={goNext} />
          )}
          {currentStep === "name" && (
            <NameStep company={company} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "phone" && (
            <PhoneStep company={company} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "worker" && (
            <WorkerStep company={company} workers={workers} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "reason" && (
            <ReasonStep company={company} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "license" && (
            <LicenseStep company={company} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "agreement" && agreement && (
            <AgreementStep company={company} agreement={agreement} data={data} onUpdate={updateData} onNext={goNext} onBack={goBack} />
          )}
          {currentStep === "confirmation" && (
            <ConfirmationStep company={company} data={data} onReset={reset} />
          )}
        </div>
      </div>
    </div>
  );
}
