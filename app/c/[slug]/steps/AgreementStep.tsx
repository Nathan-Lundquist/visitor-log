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
