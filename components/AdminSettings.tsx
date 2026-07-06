"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [innName, setInnName] = useState("Innsphere Boutique");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          System Settings
        </h2>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 text-sm">General Configuration</h3>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inn Name</label>
            <input
              type="text"
              value={innName}
              onChange={(e) => setInnName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-slate-500">Note: Room Management has been moved to the dedicated &quot;Manage Rooms&quot; section.</p>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
