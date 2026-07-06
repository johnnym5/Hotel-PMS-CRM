"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Users, Shield, Trash2, Key, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface StaffUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  createdAt?: any;
}

export default function StaffManagement() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalPasscode, setGlobalPasscode] = useState("STAFF123");
  const [savingPasscode, setSavingPasscode] = useState(false);
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  useEffect(() => {
    // Determine if Sandbox mode is active
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    
    if (isSandbox) {
      setStaffUsers([
        { uid: "sandbox_staff_1", email: "demo_staff@innsphere.com", role: "staff", displayName: "Demo Staff Operator" }
      ]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users"), where("role", "==", "staff"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: StaffUser[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as StaffUser);
      });
      setStaffUsers(users);
      setLoading(false);
    });

    // Fetch config for passcode
    const fetchConfig = async () => {
      try {
        const configRef = doc(db, "settings", "inn_config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data().staffPasscodes && configSnap.data().staffPasscodes.length > 0) {
          setGlobalPasscode(configSnap.data().staffPasscodes[0]);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchConfig();

    return () => unsubscribe();
  }, []);

  const handleRevokeAccess = async (uid: string) => {
    if (!confirm("Are you sure you want to revoke staff access for this user? They will be demoted to 'client'.")) return;
    try {
      const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
      if (isSandbox) {
        setStaffUsers(prev => prev.filter(u => u.uid !== uid));
        return;
      }
      await updateDoc(doc(db, "users", uid), {
        role: "client"
      });
    } catch (err) {
      console.error(err);
      alert("Failed to revoke access.");
    }
  };

  const handleSavePasscode = async () => {
    if (!globalPasscode.trim()) return;
    setSavingPasscode(true);
    setPasscodeSuccess(false);
    try {
      const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
      if (isSandbox) {
        setTimeout(() => {
          setSavingPasscode(false);
          setPasscodeSuccess(true);
          setTimeout(() => setPasscodeSuccess(false), 3000);
        }, 500);
        return;
      }

      const configRef = doc(db, "settings", "inn_config");
      await setDoc(configRef, { staffPasscodes: [globalPasscode.trim()] }, { merge: true });
      setSavingPasscode(false);
      setPasscodeSuccess(true);
      setTimeout(() => setPasscodeSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update passcode.");
      setSavingPasscode(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
          <Shield className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm shadow-inner">
            <Users className="w-8 h-8 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-1">Staff Access Management</h2>
            <p className="text-indigo-200 text-sm max-w-xl font-light">
              Review active staff accounts, revoke access, and manage the global registration passcode used to authenticate new team members.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Passcode Config */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800">Registration Passcode</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              New staff must enter this passcode when creating their account to be automatically granted the &quot;staff&quot; role.
            </p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={globalPasscode}
                  onChange={(e) => setGlobalPasscode(e.target.value)}
                  className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  placeholder="e.g. STAFF2026"
                />
              </div>
              <button
                onClick={handleSavePasscode}
                disabled={savingPasscode}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {savingPasscode ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : passcodeSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Updated
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Passcode
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Active Staff Accounts
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                {staffUsers.length} Users
              </span>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : staffUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">No staff accounts found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staffUsers.map((user) => (
                    <motion.div 
                      key={user.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner">
                          {(user.displayName || user.email || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{user.displayName || "Unknown Name"}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => handleRevokeAccess(user.uid)}
                          className="px-3 py-1.5 bg-white border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke Access
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
