# Plan 2: Kiosk Card-Stack Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current split-layout kiosk page (`/c/[slug]`) with a full-screen, tablet-first card-stack wizard. Each check-in step gets its own screen. Completed steps collapse into summary bars that stack behind the active card. Includes license photo capture, NDA/agreement signing with signature pad, and company branding via primary color.

**Architecture:** The kiosk is a single client component (`KioskWizard.tsx`) that manages wizard state. Each step is a separate component file. The wizard orchestrates step transitions with CSS animations. The server component (`page.tsx`) fetches company data, workers, and agreement info, passing it all as props.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, getUserMedia API (camera), Canvas API (signature pad)

**Depends on:** Plan 1 (database & API foundation) must be completed first.

---

## File Structure

```
app/c/[slug]/
├── page.tsx                    # Server component — fetches company, workers, agreement
├── KioskWizard.tsx             # Main wizard orchestrator — manages steps, animations, state
├── steps/
│   ├── WelcomeStep.tsx         # Step 1: company logo, welcome message, "Tap to Check In"
│   ├── NameStep.tsx            # Step 2: first name + last name inputs
│   ├── PhoneStep.tsx           # Step 3: phone number input
│   ├── WorkerStep.tsx          # Step 4: who are you here to see (worker list)
│   ├── ReasonStep.tsx          # Step 5: reason for visit (preset buttons)
│   ├── LicenseStep.tsx         # Step 6: camera capture of ID (conditional)
│   ├── AgreementStep.tsx       # Step 7: PDF viewer + signature pad (conditional)
│   └── ConfirmationStep.tsx    # Step 8: success screen, auto-reset
├── CheckInForm.tsx             # DELETE — replaced by wizard
└── KioskPage.tsx               # DELETE — replaced by wizard
```

---

### Task 1: Create wizard types and step interface

**Files:**
- Create: `app/c/[slug]/types.ts`

- [ ] **Step 1: Write the shared types file**

Write `app/c/[slug]/types.ts`:

```typescript
export interface Worker {
  id: number;
  name: string;
  title: string | null;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  require_license: boolean;
  require_agreement: boolean;
}

export interface Agreement {
  id: number;
  file_url: string;
  filename: string;
}

export interface CheckInData {
  first_name: string;
  last_name: string;
  phone: string;
  worker_id: number | null;
  worker_name: string | null;
  reason: string;
  license_photo: File | null;
  signature_data: string | null;
}

export interface StepProps {
  company: Company;
  data: CheckInData;
  onUpdate: (updates: Partial<CheckInData>) => void;
  onNext: () => void;
  onBack: () => void;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/types.ts
git commit -m "feat: add kiosk wizard types"
```

---

### Task 2: Create WelcomeStep

**Files:**
- Create: `app/c/[slug]/steps/WelcomeStep.tsx`

- [ ] **Step 1: Write the WelcomeStep component**

```bash
mkdir -p /home/nathan/projects/visitor-log/app/c/\[slug\]/steps
```

Write `app/c/[slug]/steps/WelcomeStep.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/WelcomeStep.tsx
git commit -m "feat: add WelcomeStep component"
```

---

### Task 3: Create NameStep

**Files:**
- Create: `app/c/[slug]/steps/NameStep.tsx`

- [ ] **Step 1: Write the NameStep component**

Write `app/c/[slug]/steps/NameStep.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/NameStep.tsx
git commit -m "feat: add NameStep component"
```

---

### Task 4: Create PhoneStep

**Files:**
- Create: `app/c/[slug]/steps/PhoneStep.tsx`

- [ ] **Step 1: Write the PhoneStep component**

Write `app/c/[slug]/steps/PhoneStep.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/PhoneStep.tsx
git commit -m "feat: add PhoneStep component"
```

---

### Task 5: Create WorkerStep

**Files:**
- Create: `app/c/[slug]/steps/WorkerStep.tsx`

- [ ] **Step 1: Write the WorkerStep component**

Write `app/c/[slug]/steps/WorkerStep.tsx`:

```typescript
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

  const isSelected = selected !== undefined;

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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/WorkerStep.tsx
git commit -m "feat: add WorkerStep component"
```

---

### Task 6: Create ReasonStep

**Files:**
- Create: `app/c/[slug]/steps/ReasonStep.tsx`

- [ ] **Step 1: Write the ReasonStep component**

Write `app/c/[slug]/steps/ReasonStep.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/ReasonStep.tsx
git commit -m "feat: add ReasonStep component"
```

---

### Task 7: Create LicenseStep (camera capture)

**Files:**
- Create: `app/c/[slug]/steps/LicenseStep.tsx`

- [ ] **Step 1: Write the LicenseStep component**

Write `app/c/[slug]/steps/LicenseStep.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { StepProps } from "../types";

export default function LicenseStep({ company, data, onUpdate, onNext, onBack }: StepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Camera access denied. Please allow camera access and try again.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCaptured(dataUrl);
    stream?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    setCaptured(null);
    startCamera();
  }

  function handleNext() {
    if (!captured) return;
    // Convert data URL to File for upload
    const byteString = atob(captured.split(",")[1]);
    const mimeString = captured.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const file = new File([ab], "license.jpg", { type: mimeString });
    onUpdate({ license_photo: file });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Photo ID</h2>
        <p className="text-slate-400">Please photograph your driver's license or ID</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={captured} alt="Captured ID" className="w-full h-full object-cover" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!captured ? (
        <button
          onClick={capture}
          disabled={!!error}
          style={{ backgroundColor: company.primary_color }}
          className="w-full py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95 disabled:bg-slate-300"
        >
          Capture Photo
        </button>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={retake}
            className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
          >
            Retake
          </button>
          <button
            onClick={handleNext}
            style={{ backgroundColor: company.primary_color }}
            className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95"
          >
            Continue
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
        >
          Back
        </button>
        {!captured && (
          <button
            onClick={() => { onUpdate({ license_photo: null }); onNext(); }}
            className="flex-1 py-4 rounded-xl bg-slate-50 text-slate-400 text-lg font-medium transition hover:bg-slate-100 active:scale-95"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/LicenseStep.tsx
git commit -m "feat: add LicenseStep with camera capture"
```

---

### Task 8: Create AgreementStep (PDF + signature pad)

**Files:**
- Create: `app/c/[slug]/steps/AgreementStep.tsx`

- [ ] **Step 1: Write the AgreementStep component**

Write `app/c/[slug]/steps/AgreementStep.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Company, Agreement, CheckInData } from "../types";

export default function AgreementStep({
  company,
  agreement,
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  company: Company;
  agreement: Agreement;
  data: CheckInData;
  onUpdate: (updates: Partial<CheckInData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function handleAgreeAndSign() {
    if (!canvasRef.current || !hasSignature) return;
    const signatureData = canvasRef.current.toDataURL("image/png");
    onUpdate({ signature_data: signatureData });
    onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Agreement</h2>
        <p className="text-slate-400">Please review and sign: {agreement.filename}</p>
      </div>

      {/* PDF Viewer */}
      <div className="rounded-xl overflow-hidden border-2 border-slate-200 bg-white" style={{ height: "35vh" }}>
        <iframe
          src={`${agreement.file_url}#toolbar=0&navpanes=0`}
          className="w-full h-full"
          title="Agreement PDF"
        />
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-slate-600">I have read and agree to the terms above</span>
      </label>

      {/* Signature pad */}
      {agreed && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Sign below</span>
            <button onClick={clearSignature} className="text-sm text-slate-400 hover:text-slate-600">
              Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-crosshair touch-none"
            style={{ height: "120px" }}
          />
        </div>
      )}

      <div className="flex gap-4 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 text-lg font-semibold transition hover:bg-slate-200 active:scale-95"
        >
          Back
        </button>
        <button
          onClick={handleAgreeAndSign}
          disabled={!agreed || !hasSignature}
          style={{ backgroundColor: agreed && hasSignature ? company.primary_color : undefined }}
          className="flex-[2] py-4 rounded-xl text-white text-lg font-semibold transition hover:opacity-90 active:scale-95 disabled:bg-slate-300"
        >
          I Agree & Sign
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/AgreementStep.tsx
git commit -m "feat: add AgreementStep with PDF viewer and signature pad"
```

---

### Task 9: Create ConfirmationStep

**Files:**
- Create: `app/c/[slug]/steps/ConfirmationStep.tsx`

- [ ] **Step 1: Write the ConfirmationStep component**

Write `app/c/[slug]/steps/ConfirmationStep.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/steps/ConfirmationStep.tsx
git commit -m "feat: add ConfirmationStep with auto-reset countdown"
```

---

### Task 10: Create KioskWizard orchestrator

**Files:**
- Create: `app/c/[slug]/KioskWizard.tsx`

- [ ] **Step 1: Write the KioskWizard component**

Write `app/c/[slug]/KioskWizard.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/c/[slug]/KioskWizard.tsx
git commit -m "feat: add KioskWizard orchestrator with card-stack layout"
```

---

### Task 11: Update server component and wire up wizard

**Files:**
- Modify: `app/c/[slug]/page.tsx`
- Delete: `app/c/[slug]/CheckInForm.tsx`
- Delete: `app/c/[slug]/KioskPage.tsx`

- [ ] **Step 1: Rewrite page.tsx to use KioskWizard**

Replace entire content of `app/c/[slug]/page.tsx`:

```typescript
import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import KioskWizard from "./KioskWizard";

export const dynamic = "force-dynamic";

export default async function CompanyCheckIn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const companyResult = await sql`
    SELECT id, name, slug, logo_url, welcome_message, primary_color, require_license, require_agreement
    FROM companies WHERE slug = ${slug}
  `;
  const company = companyResult.rows[0];
  if (!company) notFound();

  const workersResult = await sql`SELECT id, name, title FROM workers WHERE company_id = ${company.id} ORDER BY name`;

  // Fetch active agreement if required
  let agreement = null;
  if (company.require_agreement) {
    const agResult = await sql`
      SELECT id, file_url, filename FROM agreements
      WHERE company_id = ${company.id} AND enabled = true
      ORDER BY created_at DESC LIMIT 1
    `;
    agreement = agResult.rows[0] || null;
  }

  return (
    <KioskWizard
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url,
        welcome_message: company.welcome_message,
        primary_color: company.primary_color || "#3b82f6",
        require_license: company.require_license || false,
        require_agreement: company.require_agreement || false,
      }}
      workers={workersResult.rows as { id: number; name: string; title: string | null }[]}
      agreement={agreement}
    />
  );
}
```

- [ ] **Step 2: Delete old components**

```bash
rm /home/nathan/projects/visitor-log/app/c/\[slug\]/CheckInForm.tsx
rm /home/nathan/projects/visitor-log/app/c/\[slug\]/KioskPage.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A app/c/[slug]/
git commit -m "feat: replace kiosk with card-stack wizard, remove old form components"
```

---

### Task 12: Deploy and test

- [ ] **Step 1: Deploy**

```bash
cd /home/nathan/projects/visitor-log && vercel --prod --yes
```

- [ ] **Step 2: Test the wizard flow**

Open `https://visit.pcshards.com/c/brico-welding` on a tablet or browser. Verify:
- Welcome screen shows with company name
- Each step slides into view
- Previous steps collapse into summary bars
- Check-in creates a visitor record
- Confirmation screen auto-resets after 15s

- [ ] **Step 3: Commit any fixes**
