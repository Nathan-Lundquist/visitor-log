"use client";

import { useEffect, useState } from "react";

interface Settings {
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  primary_color: string;
  require_license: boolean;
  require_agreement: boolean;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [requireLicense, setRequireLicense] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setWelcomeMessage(data.welcome_message || "");
      setPrimaryColor(data.primary_color || "#3b82f6");
      setRequireLicense(data.require_license || false);
    }
  }

  async function handleSave() {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        welcome_message: welcomeMessage.trim() || null,
        primary_color: primaryColor,
        require_license: requireLicense,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/logo", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      loadSettings();
    }
    setUploadingLogo(false);
    e.target.value = "";
  }

  function copyKioskUrl() {
    if (!settings) return;
    const url = `${window.location.origin}/c/${settings.slug}`;
    navigator.clipboard.writeText(url);
  }

  if (!settings) {
    return <p className="text-slate-400 text-center py-8">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Kiosk URL */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Kiosk URL</h2>
        <p className="text-sm text-slate-500 mb-4">Share this link to set up a check-in kiosk</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
            {typeof window !== "undefined" ? `${window.location.origin}/c/${settings.slug}` : `/c/${settings.slug}`}
          </code>
          <button
            onClick={copyKioskUrl}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Branding</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Logo</label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                  No logo
                </div>
              )}
              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition cursor-pointer">
                {uploadingLogo ? "Uploading..." : settings.logo_url ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
            <input
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome to our office"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
              />
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
              <div className="w-24 h-10 rounded-lg" style={{ backgroundColor: primaryColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Kiosk Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Kiosk Configuration</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Require Photo ID</p>
              <p className="text-sm text-slate-400">Visitors must photograph their license during check-in</p>
            </div>
            <button
              onClick={() => setRequireLicense(!requireLicense)}
              className={`relative w-12 h-7 rounded-full transition ${
                requireLicense ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  requireLicense ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <div>
              <p className="font-medium text-slate-700">Require Agreement Signing</p>
              <p className="text-sm text-slate-400">Managed in the Agreements tab</p>
            </div>
            <div className={`relative w-12 h-7 rounded-full ${settings.require_agreement ? "bg-blue-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow ${settings.require_agreement ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          Save Settings
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
      </div>
    </div>
  );
}
