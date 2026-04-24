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
