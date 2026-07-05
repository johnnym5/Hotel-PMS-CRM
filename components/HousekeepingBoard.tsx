"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { BedDouble, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function HousekeepingBoard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userUid = auth.currentUser.uid;
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";

    if (isSandbox) {
      // Stub sandbox mode for housekeeping
      setRooms([
        { roomNumber: "101", status: "needs_cleaning", lastGuestOut: "2026-07-05", priority: "high" },
        { roomNumber: "102", status: "clean", lastGuestOut: "2026-07-04", priority: "low" },
        { roomNumber: "201", status: "needs_turnover", lastGuestOut: "Active", priority: "medium" }
      ]);
      setLoading(false);
      return;
    }

    // Try reading rooms collection, or fallback to inferring from bookings
    const q = query(collection(db, "rooms"), where("ownerId", "==", userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(roomData.length > 0 ? roomData : []);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markClean = async (roomId: string) => {
    // Optimistic UI or actual update
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    if (isSandbox) {
      setRooms(prev => prev.map(r => r.roomNumber === roomId ? { ...r, status: "clean" } : r));
      return;
    }

    try {
      await updateDoc(doc(db, "rooms", roomId), {
        status: "clean"
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading rooms...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        Housekeeping Board
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {rooms.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-sm">
              No rooms configured. Set up rooms in Admin Settings.
            </div>
          ) : (
            rooms.map((r, i) => (
              <motion.div
                layout
                key={r.id || r.roomNumber}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border ${r.status === "clean" ? "bg-emerald-50/50 border-emerald-100" : r.status === "needs_turnover" ? "bg-amber-50/50 border-amber-100" : "bg-rose-50/50 border-rose-100"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BedDouble className={`w-4 h-4 ${r.status === "clean" ? "text-emerald-500" : "text-slate-600"}`} />
                    <span className="font-bold text-slate-800">Room {r.roomNumber}</span>
                  </div>
                  {r.status === "clean" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Clean</span>
                  ) : r.status === "needs_turnover" ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Turnover</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">Dirty</span>
                  )}
                </div>
                
                <p className="text-xs text-slate-500 font-medium mb-4">
                  Priority: <span className="capitalize">{r.priority || "Normal"}</span>
                </p>

                {r.status !== "clean" && (
                  <button
                    onClick={() => markClean(r.id || r.roomNumber)}
                    className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Mark as Clean
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
