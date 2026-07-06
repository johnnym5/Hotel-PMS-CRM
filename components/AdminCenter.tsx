"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Users, Activity, AlertCircle, TrendingUp, Server, Database } from "lucide-react";
import { motion } from "motion/react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function AdminCenter() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Bank Details State
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState("");

  useEffect(() => {
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    
    if (isSandbox) {
      const sbGuests = JSON.parse(localStorage.getItem("innsphere_sandbox_guests") || "[]");
      const sbBookings = JSON.parse(localStorage.getItem("innsphere_sandbox_bookings") || "[]");
      setTotalUsers(sbGuests.length + 1);
      setTotalBookings(sbBookings.length);
      setTotalRevenue(sbBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0));
      
      const handleLocalUpdate = () => {
        const upGuests = JSON.parse(localStorage.getItem("innsphere_sandbox_guests") || "[]");
        const upBookings = JSON.parse(localStorage.getItem("innsphere_sandbox_bookings") || "[]");
        setTotalUsers(upGuests.length + 1);
        setTotalBookings(upBookings.length);
        setTotalRevenue(upBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0));
        
        const localSettings = JSON.parse(localStorage.getItem("innsphere_sandbox_settings") || "{}");
        if (localSettings.paymentDetails) {
          setBankName(localSettings.paymentDetails.bankName || "");
          setAccountNumber(localSettings.paymentDetails.accountNumber || "");
          setAccountName(localSettings.paymentDetails.accountName || "");
        }
      };
      
      // Initial call
      handleLocalUpdate();
      
      window.addEventListener("innsphere_local_update", handleLocalUpdate);
      return () => window.removeEventListener("innsphere_local_update", handleLocalUpdate);
    }

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setTotalUsers(snap.size);
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      setTotalBookings(snap.size);
      let rev = 0;
      snap.forEach(doc => {
        rev += (doc.data().totalAmount || 0);
      });
      setTotalRevenue(rev);
    });

    return () => {
      unsubUsers();
      unsubBookings();
    };
  }, []);

  useEffect(() => {
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    if (isSandbox) return;

    import("firebase/firestore").then(({ doc, getDoc }) => {
      getDoc(doc(db, "settings", "global")).then((snap) => {
        if (snap.exists() && snap.data().paymentDetails) {
          setBankName(snap.data().paymentDetails.bankName || "");
          setAccountNumber(snap.data().paymentDetails.accountNumber || "");
          setAccountName(snap.data().paymentDetails.accountName || "");
        }
      }).catch(console.error);
    });
  }, []);

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankMsg("");

    const paymentDetails = { bankName, accountNumber, accountName };

    try {
      const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
      if (isSandbox) {
        const localSettings = JSON.parse(localStorage.getItem("innsphere_sandbox_settings") || "{}");
        localSettings.paymentDetails = paymentDetails;
        localStorage.setItem("innsphere_sandbox_settings", JSON.stringify(localSettings));
        window.dispatchEvent(new Event("innsphere_local_update"));
      } else {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "settings", "global"), { paymentDetails }, { merge: true });
      }
      setBankMsg("Bank details saved successfully!");
      setTimeout(() => setBankMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setBankMsg("Failed to save bank details.");
    } finally {
      setSavingBank(false);
    }
  };

  const metrics = [
    {
      id: "staff-management",
      title: "Staff Management",
      description: "Manage team members and permissions",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      count: 12,
      status: "Active",
    },
    {
      id: "system-logs",
      title: "System Logs",
      description: "Monitor system events and activities",
      icon: Activity,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      count: 247,
      status: "Last 24h",
    },
    {
      id: "database-health",
      title: "Database Health",
      description: "Monitor database performance",
      icon: Database,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      count: "98.5%",
      status: "Uptime",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 text-white p-8 mb-8 rounded-2xl shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Admin Center</h1>
            </div>
            <p className="text-slate-200 text-sm max-w-2xl">
              Manage your entire Innsphere installation. Monitor system health, manage staff access, and configure application settings.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">Active</p>
            <p className="text-slate-300 text-sm">All Systems Operational</p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">Total Users</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">Total Bookings</p>
            <p className="text-2xl font-bold">{totalBookings}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">₦{totalRevenue.toLocaleString('en-NG')}</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="px-8 pb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Administrative Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            const isSelected = selectedMetric === metric.id;

            return (
              <motion.button
                key={metric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                onClick={() => setSelectedMetric(isSelected ? null : metric.id)}
                className={`relative group text-left transition-all transform ${
                  isSelected ? "scale-105" : "hover:scale-102"
                }`}
              >
                <div
                  className={`h-full bg-white border-2 ${metric.borderColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all ${
                    isSelected ? `ring-2 ring-offset-2 ring-indigo-500 ${metric.bgColor}` : ""
                  }`}
                >
                  {/* Icon Badge */}
                  <div
                    className={`inline-flex p-3 rounded-xl mb-4 bg-gradient-to-br ${metric.color} text-white shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{metric.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{metric.description}</p>

                  {/* Status */}
                  <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{metric.count}</p>
                      <p className="text-xs text-slate-500">{metric.status}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-200 space-y-2"
                    >
                      <button className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors">
                        View Details
                      </button>
                      <button className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                        Configure Settings
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* System Alerts Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              System Alerts
            </h2>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm mb-1">Firestore Security Rules Configured</p>
                <p className="text-xs text-slate-600">
                  Your Firestore security rules are active and all admin operations are restricted to authenticated admin accounts only.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Configuration */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              Manual Payment Details
            </h2>
            <form onSubmit={handleSaveBankDetails} className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bank Name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} required className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. GTBank" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account Number</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0123456789" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account Name</label>
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} required className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Innsphere Hotels" />
              </div>
              
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600">{bankMsg}</span>
                <button type="submit" disabled={savingBank} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50">
                  {savingBank ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
