"use client";

import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { BedDouble, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Room } from "../app/page";

interface Booking {
  id: string;
  roomNumber: string;
  status: string;
  checkOut: string;
  checkIn: string;
}

export default function Housekeeping() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const isSandbox = typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true";

  useEffect(() => {
    if (isSandbox) {
      const loadData = () => {
        const rawRooms = localStorage.getItem("innsphere_sandbox_rooms");
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        
        const localRooms = rawRooms ? JSON.parse(rawRooms) : [];
        const localBookings = rawBookings ? JSON.parse(rawBookings) : [];
        
        setRooms(localRooms);
        setBookings(localBookings);
        setLoading(false);
      };

      loadData();
      window.addEventListener("innsphere_local_update", loadData);
      window.addEventListener("storage", loadData);
      return () => {
        window.removeEventListener("innsphere_local_update", loadData);
        window.removeEventListener("storage", loadData);
      };
    } else {
      if (!auth.currentUser) return;

      const unsubscribeRooms = onSnapshot(query(collection(db, "rooms")), (snapshot) => {
        const roomData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Room));
        setRooms(roomData);
      });

      const unsubscribeBookings = onSnapshot(query(collection(db, "bookings")), (snapshot) => {
        const bookingData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
        setBookings(bookingData);
        setLoading(false);
      });

      return () => {
        unsubscribeRooms();
        unsubscribeBookings();
      };
    }
  }, [isSandbox]);

  const markClean = async (room: Room) => {
    const roomId = room.id || room.roomNumber;
    
    if (isSandbox) {
      const rawRooms = localStorage.getItem("innsphere_sandbox_rooms");
      if (rawRooms) {
        const localRooms: Room[] = JSON.parse(rawRooms);
        const updatedRooms = localRooms.map(r => r.roomNumber === room.roomNumber ? { ...r, status: "active" } : r);
        localStorage.setItem("innsphere_sandbox_rooms", JSON.stringify(updatedRooms));
        window.dispatchEvent(new Event("innsphere_local_update"));
      }
      return;
    }

    try {
      if (roomId) {
        await updateDoc(doc(db, "rooms", roomId), {
          status: "active"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading rooms...</div>;
  }

  // Derive Housekeeping state
  const enrichedRooms = rooms.map(room => {
    // Find latest booking
    const roomBookings = bookings.filter(b => b.roomNumber === room.roomNumber);
    roomBookings.sort((a, b) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime());
    const latestBooking = roomBookings[0];

    let hkStatus = "clean"; // default green
    
    // Logic: Red if maintenance/dirty, or recently checked out
    if (room.status === "maintenance" || room.status === "dirty") {
      hkStatus = "dirty";
    } else if (latestBooking && latestBooking.status === "checked_out" && room.status !== "active") {
      hkStatus = "dirty";
    } else if (latestBooking && latestBooking.status === "checked_in") {
      hkStatus = "occupied";
    }

    return {
      ...room,
      hkStatus
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        Housekeeping Board
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {enrichedRooms.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-sm">
              No rooms configured. Set up rooms in Admin Settings.
            </div>
          ) : (
            enrichedRooms.map((r, i) => (
              <motion.div
                layout
                key={r.id || r.roomNumber}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border ${
                  r.hkStatus === "clean" ? "bg-emerald-50/50 border-emerald-100" 
                  : r.hkStatus === "occupied" ? "bg-amber-50/50 border-amber-100" 
                  : "bg-rose-50/50 border-rose-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BedDouble className={`w-4 h-4 ${r.hkStatus === "clean" ? "text-emerald-500" : "text-slate-600"}`} />
                    <span className="font-bold text-slate-800">Room {r.roomNumber}</span>
                  </div>
                  {r.hkStatus === "clean" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : r.hkStatus === "occupied" ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Occupied</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Needs Cleaning
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-slate-500 font-medium mb-4">
                  Tier: <span className="capitalize font-bold">{r.tier || "Standard"}</span>
                </p>

                {r.hkStatus === "dirty" && (
                  <button
                    onClick={() => markClean(r)}
                    className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Mark as Cleaned & Ready
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
