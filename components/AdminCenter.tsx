"use client";

import React, { useState } from "react";
import { BarChart3, Users, Activity, AlertCircle, TrendingUp, Server, Database } from "lucide-react";
import { motion } from "motion/react";

export default function AdminCenter() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

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
            <p className="text-2xl font-bold">247</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">System Health</p>
            <p className="text-2xl font-bold">99.2%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-1">Last Updated</p>
            <p className="text-2xl font-bold">Now</p>
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
        <div className="mt-12">
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
      </div>
    </div>
  );
}
