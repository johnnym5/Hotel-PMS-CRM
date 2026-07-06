"use client";

import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";

interface Booking {
  id: string;
  checkIn: string;
  totalAmount: number;
  status: string;
}

interface RoomData {
  id: string;
  status: string;
}

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#64748b"];

const generateMockRevenueData = () => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      day: format(date, "EEE"),
      date: format(date, "MMM dd"),
      revenue: Math.floor(Math.random() * 200000) + 40000,
    });
  }
  return data;
};

const generateMockStatusData = () => [
  { name: "Confirmed", value: 5, color: "#6366f1" },
  { name: "Checked In", value: 3, color: "#f59e0b" },
  { name: "Checked Out", value: 4, color: "#10b981" },
  { name: "Cancelled", value: 1, color: "#ef4444" },
  { name: "Maintenance", value: 2, color: "#64748b" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
        <p className="font-bold">{label}</p>
        <p className="text-indigo-300">₦{payload[0].value.toLocaleString("en-NG")}</p>
      </div>
    );
  }
  return null;
};

export default function ReportsDashboard() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const isSandbox =
    typeof window !== "undefined" &&
    localStorage.getItem("innsphere_sandbox_mode") === "true";

  useEffect(() => {
    if (isSandbox) {
      // Generate mock data for sandbox
      const mockRevenue = generateMockRevenueData();
      setRevenueData(mockRevenue);
      setTotalRevenue(mockRevenue.reduce((sum, d) => sum + d.revenue, 0));

      // Pull sandbox bookings for status data
      const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
      const bookings: Booking[] = rawBookings ? JSON.parse(rawBookings) : [];

      const rawRooms = localStorage.getItem("innsphere_sandbox_rooms");
      const rooms: RoomData[] = rawRooms ? JSON.parse(rawRooms) : [];

      const statusCounts: Record<string, number> = {};
      bookings.forEach((b) => {
        const key = b.status.replace("_", " ");
        const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
        statusCounts[capitalized] = (statusCounts[capitalized] || 0) + 1;
      });

      // Add maintenance rooms
      const maintenanceCount = rooms.filter((r) => r.status === "maintenance").length;
      if (maintenanceCount > 0) {
        statusCounts["Maintenance"] = (statusCounts["Maintenance"] || 0) + maintenanceCount;
      }

      // If no bookings exist, use mock data
      if (Object.keys(statusCounts).length === 0) {
        setStatusData(generateMockStatusData());
      } else {
        const colorMap: Record<string, string> = {
          Confirmed: "#6366f1",
          "Checked in": "#f59e0b",
          "Checked out": "#10b981",
          Cancelled: "#ef4444",
          Maintenance: "#64748b",
        };
        setStatusData(
          Object.entries(statusCounts).map(([name, value], i) => ({
            name,
            value,
            color: colorMap[name] || PIE_COLORS[i % PIE_COLORS.length],
          }))
        );
      }

      setLoading(false);
    } else {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const unsubBookings = onSnapshot(
        query(collection(db, "bookings")),
        (snapshot) => {
          const bookings: Booking[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            bookings.push({
              id: docSnap.id,
              checkIn: d.checkIn || "",
              totalAmount: Number(d.totalAmount) || 0,
              status: d.status || "confirmed",
            });
          });

          // Revenue by day for the last 7 days
          const today = startOfDay(new Date());
          const revByDay: Record<string, number> = {};
          for (let i = 6; i >= 0; i--) {
            const day = format(subDays(today, i), "yyyy-MM-dd");
            revByDay[day] = 0;
          }
          bookings.forEach((b) => {
            if (b.checkIn && revByDay[b.checkIn] !== undefined) {
              revByDay[b.checkIn] += b.totalAmount;
            }
          });

          const revData = Object.entries(revByDay).map(([dateStr, revenue]) => ({
            day: format(parseISO(dateStr), "EEE"),
            date: format(parseISO(dateStr), "MMM dd"),
            revenue,
          }));
          setRevenueData(revData);
          setTotalRevenue(revData.reduce((sum, d) => sum + d.revenue, 0));

          // Status counts
          const statusCounts: Record<string, number> = {};
          bookings.forEach((b) => {
            const key = b.status.replace("_", " ");
            const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
            statusCounts[capitalized] = (statusCounts[capitalized] || 0) + 1;
          });

          const colorMap: Record<string, string> = {
            Confirmed: "#6366f1",
            "Checked in": "#f59e0b",
            "Checked out": "#10b981",
            Cancelled: "#ef4444",
          };
          setStatusData(
            Object.entries(statusCounts).map(([name, value], i) => ({
              name,
              value,
              color: colorMap[name] || PIE_COLORS[i % PIE_COLORS.length],
            }))
          );

          setLoading(false);
        }
      );

      // Also listen to rooms for maintenance count
      const unsubRooms = onSnapshot(query(collection(db, "rooms")), (snapshot) => {
        const maintenanceCount = snapshot.docs.filter(
          (d) => d.data().status === "maintenance"
        ).length;
        if (maintenanceCount > 0) {
          setStatusData((prev) => {
            const existing = prev.find((p) => p.name === "Maintenance");
            if (existing) {
              return prev.map((p) =>
                p.name === "Maintenance" ? { ...p, value: maintenanceCount } : p
              );
            }
            return [...prev, { name: "Maintenance", value: maintenanceCount, color: "#64748b" }];
          });
        }
      });

      return () => {
        unsubBookings();
        unsubRooms();
      };
    }
  }, [isSandbox]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics &amp; Reports</h2>
          <p className="text-sm text-slate-500">Revenue trends and occupancy breakdown</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-lg"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-200">7-Day Revenue</p>
          <h3 className="text-2xl font-extrabold mt-1">₦{totalRevenue.toLocaleString("en-NG")}</h3>
          <div className="flex items-center gap-1 mt-2 text-indigo-200 text-[10px] font-semibold">
            <TrendingUp className="w-3 h-3" /> Last 7 days
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Bookings</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
            {statusData.reduce((sum, d) => sum + d.value, 0)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Across all statuses</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Avg Daily Revenue</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
            ₦{Math.round(totalRevenue / 7).toLocaleString("en-NG")}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">Per day average</p>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
        >
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            Revenue (Last 7 Days)
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="#6366f1"
                  radius={[8, 8, 0, 0]}
                  className="drop-shadow-sm"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie Chart: Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
        >
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
            <PieChartIcon className="w-3.5 h-3.5 text-indigo-600" />
            Booking Status Breakdown
          </h4>
          <div className="h-[280px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => (
                      <span className="text-[10px] font-semibold text-slate-600">{value}</span>
                    )}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Count"]}
                    contentStyle={{
                      fontSize: "11px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data available
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
