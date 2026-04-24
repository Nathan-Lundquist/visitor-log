"use client";

import { useEffect, useState } from "react";

interface AgreementData {
  id: number;
  file_url: string;
  filename: string;
  enabled: boolean;
  created_at: string;
}

interface SignedAgreement {
  id: number;
  signature_url: string;
  signed_at: string;
  filename: string;
  first_name: string;
  last_name: string;
}

export default function AgreementsTab() {
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [signatures, setSignatures] = useState<SignedAgreement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAgreement();
    loadSignatures();
  }, []);

  async function loadAgreement() {
    const res = await fetch("/api/admin/agreements");
    if (res.ok) {
      const data = await res.json();
      setAgreement(data);
    }
  }

  async function loadSignatures() {
    const res = await fetch("/api/admin/signatures");
    if (res.ok) {
      setSignatures(await res.json());
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/agreements", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      loadAgreement();
    } else {
      const data = await res.json();
      setError(data.error || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function toggleEnabled() {
    if (!agreement) return;
    await fetch("/api/admin/agreements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !agreement.enabled }),
    });
    loadAgreement();
  }

  async function deleteAgreement() {
    if (!confirm("Remove this agreement? Visitors will no longer be asked to sign.")) return;
    await fetch("/api/admin/agreements", { method: "DELETE" });
    setAgreement(null);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">NDA / Agreement</h2>
      <p className="text-sm text-slate-500 mb-6">
        Upload a PDF that visitors must review and sign during check-in.
      </p>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!agreement ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No agreement uploaded yet</p>
          <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer">
            {uploading ? "Uploading..." : "Upload PDF"}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-800">{agreement.filename}</p>
              <p className="text-sm text-slate-400">
                Uploaded {new Date(agreement.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={agreement.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View PDF
              </a>
              <button onClick={deleteAgreement} className="text-sm text-red-500 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Require signature during check-in</p>
              <p className="text-sm text-slate-400">Visitors will see this agreement and must sign</p>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative w-12 h-7 rounded-full transition ${
                agreement.enabled ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  agreement.enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition cursor-pointer">
              {uploading ? "Uploading..." : "Replace PDF"}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Signed agreements list */}
      {signatures.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Signed Agreements ({signatures.length})
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Visitor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Signed</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Signature</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(s.signed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={s.signature_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
