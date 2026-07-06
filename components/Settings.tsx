"use client";

import React, { useState, useEffect } from "react";
import { User, Moon, Bell, Info, Mail, Phone, Lock, Save, ShieldAlert, Monitor, Sun, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

interface SettingsProps {
  user: any;
  role: string | null;
}

export default function Settings({ user, role }: SettingsProps) {
  const [activeTab, setActiveTab] = useState("account");
  const { theme, setTheme } = useTheme();

  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Account State
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Notification State
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  const isSandbox = !auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");
  const currentUserId = auth.currentUser?.uid || (typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_id") : null) || "sandbox_user";

  useEffect(() => {
    // Load initial data
    if (user) {
      setDisplayName(user.displayName || "");
    }

    const loadSettings = async () => {
      if (isSandbox) {
        const localSettings = JSON.parse(localStorage.getItem(`innsphere_settings_${currentUserId}`) || "{}");
        if (localSettings.phone) setPhone(localSettings.phone);
        if (localSettings.emailReceipts !== undefined) setEmailReceipts(localSettings.emailReceipts);
        if (localSettings.inAppAlerts !== undefined) setInAppAlerts(localSettings.inAppAlerts);
        
        // In sandbox, check if there's a stored display name override
        const storedName = localStorage.getItem(`innsphere_sandbox_name_${currentUserId}`);
        if (storedName) setDisplayName(storedName);
      } else {
        try {
          const snap = await getDoc(doc(db, "userSettings", currentUserId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.phone) setPhone(data.phone);
            if (data.emailReceipts !== undefined) setEmailReceipts(data.emailReceipts);
            if (data.inAppAlerts !== undefined) setInAppAlerts(data.inAppAlerts);
          }
        } catch (e) {
          console.error("Failed to load user settings", e);
        }
      }
    };

    loadSettings();
  }, [user, isSandbox, currentUserId]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    
    try {
      if (isSandbox) {
        localStorage.setItem(`innsphere_sandbox_name_${currentUserId}`, displayName);
        const localSettings = JSON.parse(localStorage.getItem(`innsphere_settings_${currentUserId}`) || "{}");
        localSettings.phone = phone;
        localStorage.setItem(`innsphere_settings_${currentUserId}`, JSON.stringify(localSettings));
        window.dispatchEvent(new Event("innsphere_local_update"));
        showToast("Account details saved successfully.");
      } else {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName });
        }
        await setDoc(doc(db, "userSettings", currentUserId), { phone }, { merge: true });
        showToast("Account details saved to Firebase.");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to save account details.", "error");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsResettingPass(true);
    try {
      if (isSandbox) {
        setTimeout(() => {
          showToast("Sandbox: Password reset email sent (simulated).");
          setIsResettingPass(false);
        }, 1000);
      } else {
        if (auth.currentUser?.email) {
          await sendPasswordResetEmail(auth, auth.currentUser.email);
          showToast(`Password reset email sent to ${auth.currentUser.email}.`);
        } else {
          showToast("No email associated with this account.", "error");
        }
        setIsResettingPass(false);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to send reset email.", "error");
      setIsResettingPass(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotifs(true);
    
    try {
      if (isSandbox) {
        const localSettings = JSON.parse(localStorage.getItem(`innsphere_settings_${currentUserId}`) || "{}");
        localSettings.emailReceipts = emailReceipts;
        localSettings.inAppAlerts = inAppAlerts;
        localStorage.setItem(`innsphere_settings_${currentUserId}`, JSON.stringify(localSettings));
        showToast("Notification preferences updated.");
      } else {
        await setDoc(doc(db, "userSettings", currentUserId), { 
          emailReceipts, 
          inAppAlerts 
        }, { merge: true });
        showToast("Notification preferences saved to Firebase.");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to save notification preferences.", "error");
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const TABS = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Moon },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "support", label: "Support & About", icon: Info },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 w-full h-full pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences, appearance, and notifications.</p>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 font-semibold text-sm ${
              toastType === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400" 
                : "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-400"
            }`}
          >
            {toastType === "success" ? <Save className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Nav */}
        <div className="w-full lg:w-64 flex flex-col gap-1 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 min-h-[500px]">
          
          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Account Settings</h2>
              
              <form onSubmit={handleSaveAccount} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 transition-all"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 transition-all"
                      placeholder="+234..."
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSavingAccount}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm disabled:opacity-70 flex items-center gap-2"
                  >
                    {isSavingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Account Details
                  </button>
                </div>
              </form>

              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> Security
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">We will send a secure password reset link to your registered email address.</p>
                <button 
                  onClick={handlePasswordReset}
                  disabled={isResettingPass}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                >
                  {isResettingPass && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Password Reset Email
                </button>
              </div>
            </motion.div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Appearance</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Customize how Innsphere CRM looks on your device.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    theme === 'light' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Sun className="w-8 h-8" />
                  <span className="font-semibold text-sm">Light Mode</span>
                </button>

                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    theme === 'dark' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Moon className="w-8 h-8" />
                  <span className="font-semibold text-sm">Dark Mode</span>
                </button>

                <button 
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                    theme === 'system' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Monitor className="w-8 h-8" />
                  <span className="font-semibold text-sm">System Default</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Notifications</h2>
              
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Email Receipts</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receive PDF receipts directly in your inbox after payment confirmation.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={emailReceipts} onChange={(e) => setEmailReceipts(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">In-App Alerts</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show toast notifications for approaching checkouts and system updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={inAppAlerts} onChange={(e) => setInAppAlerts(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSavingNotifs}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm disabled:opacity-70 flex items-center gap-2"
                  >
                    {isSavingNotifs && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Preferences
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SUPPORT & ABOUT TAB */}
          {activeTab === "support" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-500" /> About Innsphere
                </h2>
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">I</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Innsphere CRM</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Version 1.0.0</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Innsphere is a premier property management system built for boutique inns and guest houses. It streamlines room allocations, handles secure multi-tier user authentication, and provides robust financial tracking modules.
                  </p>
                  <div className="flex gap-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <a href="#" className="hover:underline">Terms of Service</a>
                    <a href="#" className="hover:underline">Privacy Policy</a>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Contact Support</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3 bg-white dark:bg-slate-900">
                    <Mail className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Us</p>
                      <a href="mailto:support@innsphere.com" className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">support@innsphere.com</a>
                    </div>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3 bg-white dark:bg-slate-900">
                    <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Call Us</p>
                      <a href="tel:+18005551234" className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">+1 (800) 555-1234</a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
