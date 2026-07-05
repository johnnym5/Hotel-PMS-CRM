"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { ChevronLeft, ChevronRight, Calendar, User, Eye, Info, Clock, Check, RefreshCw } from "lucide-react";
import { format, addDays, subDays, startOfDay, isWithinInterval, parseISO, differenceInDays } from "date-fns";

interface Booking {
  id: string;
  guestId: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  notes: string;
}

interface CalendarTimelineProps {
  onSelectGuest: (guestId: string) => void;
}

// Fixed list of rooms at the Innsphere Inn
const ROOMS = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205"];

export default function CalendarTimeline({ onSelectGuest }: CalendarTimelineProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);

  const isSandbox = !auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");
  const currentUserId = auth.currentUser?.uid || (typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_id") : null) || "sandbox_user";

  // Generate 14 days for the timeline headers starting from startDate
  const days = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

  useEffect(() => {
    if (isSandbox) {
      const loadLocalBookings = () => {
        try {
          const raw = localStorage.getItem("innsphere_sandbox_bookings");
          const allBookings: Booking[] = raw ? JSON.parse(raw) : [];
          // Filter by ownerId of the active sandbox staff operator
          const userBookings = allBookings.filter(b => {
            // Find guest in the sandbox registry to ensure it belongs to this operator
            const rawGuests = localStorage.getItem("innsphere_sandbox_guests") || "[]";
            const allGuests: any[] = JSON.parse(rawGuests);
            const guest = allGuests.find(g => g.id === b.guestId);
            return (guest && guest.ownerId === currentUserId) || b.id.startsWith("booking_seed_");
          });
          setBookings(userBookings);
          setLoading(false);
        } catch (e) {
          console.error("Error loading local bookings", e);
          setBookings([]);
          setLoading(false);
        }
      };

      loadLocalBookings();

      const handleStorageChange = () => {
        loadLocalBookings();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("innsphere_local_update", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("innsphere_local_update", handleStorageChange);
      };
    } else {
      if (!auth.currentUser) return;

      const path = "bookings";
      const q = query(
        collection(db, path),
        where("ownerId", "==", auth.currentUser.uid),
        orderBy("checkIn", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loadedBookings: Booking[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedBookings.push({
              id: docSnap.id,
              guestId: data.guestId || "",
              guestName: data.guestName || "",
              roomNumber: data.roomNumber || "",
              checkIn: data.checkIn || "",
              checkOut: data.checkOut || "",
              status: data.status || "confirmed",
              totalAmount: Number(data.totalAmount) || 0,
              notes: data.notes || "",
            });
          });
          setBookings(loadedBookings);
          setLoading(false);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, path);
          } catch (wrappedError) {
            console.error("Failed to load timeline bookings.");
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    }
  }, [auth.currentUser, currentUserId, isSandbox]);

  const handlePrevDays = () => {
    setStartDate(subDays(startDate, 7));
  };

  const handleNextDays = () => {
    setStartDate(addDays(startDate, 7));
  };

  const handleToday = () => {
    setStartDate(startOfDay(new Date()));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col h-full overflow-hidden" id="calendar-timeline-panel">
      {/* Timeline Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Live Room Allocation Board
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Timeline overview of active and upcoming inn reservations</p>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handlePrevDays}
            className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Previous 7 Days"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextDays}
            className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Next 7 Days"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Grid Timeline Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto mt-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 mr-2" />
            Loading timeline scheduler...
          </div>
        ) : (
          <div className="min-w-[850px] relative">
            
            {/* Header Columns: Rooms & Dates */}
            <div className="grid grid-cols-[100px_repeat(14,1fr)] border-b border-slate-200 bg-slate-50/50 rounded-t-xl sticky top-0 z-10">
              <div className="p-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-100">
                Room
              </div>
              {days.map((day, idx) => {
                const isTodayStr = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                return (
                  <div
                    key={idx}
                    className={`p-2.5 text-center flex flex-col items-center justify-center border-r border-slate-100 last:border-0 ${
                      isTodayStr ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {format(day, "EEE")}
                    </span>
                    <span className={`text-xs font-bold mt-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayStr ? "bg-indigo-600 text-white" : "text-slate-700"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <span className="text-[8px] text-slate-400 mt-0.5">
                      {format(day, "MMM")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Room Rows & Timeline Allocations */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-b-xl overflow-hidden bg-white">
              {ROOMS.map((roomNum) => {
                return (
                  <div key={roomNum} className="grid grid-cols-[100px_repeat(14,1fr)] h-16 relative">
                    {/* Room Cell */}
                    <div className="p-3 bg-slate-50/40 border-r border-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 uppercase tracking-wider">
                      Room {roomNum}
                    </div>

                    {/* Timeline Days Grid lines */}
                    {days.map((_, idx) => (
                      <div
                        key={idx}
                        className="border-r border-slate-100/70 last:border-0 h-full relative"
                      />
                    ))}

                    {/* Spanning Booking bars absolutely overlayed inside this row */}
                    {bookings
                      .filter((booking) => booking.roomNumber === roomNum)
                      .map((booking) => {
                        // Math to check if booking overlaps with this 14-day window
                        const bookingCheckIn = parseISO(booking.checkIn);
                        const bookingCheckOut = parseISO(booking.checkOut);

                        // Find indices within our 14-day window
                        let startColIdx = -1;
                        let endColIdx = -1;

                        days.forEach((day, idx) => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          if (dayStr === booking.checkIn) startColIdx = idx;
                          if (dayStr === booking.checkOut) endColIdx = idx;
                        });

                        // Fallbacks if booking starts before or ends after our window
                        if (startColIdx === -1 && bookingCheckIn < days[0] && bookingCheckOut >= days[0]) {
                          startColIdx = 0;
                        }
                        if (endColIdx === -1 && bookingCheckOut > days[13] && bookingCheckIn <= days[13]) {
                          endColIdx = 13;
                        }

                        // If no overlap within this window, render nothing
                        if (startColIdx === -1 || endColIdx === -1 || endColIdx < startColIdx) {
                          return null;
                        }

                        // Calculate grid coordinates
                        // The columns start at grid column 2 (index 1 in CSS terms, but the first is room list)
                        const startGridCol = startColIdx + 2;
                        const span = endColIdx - startColIdx + 1;

                        // Styling colors based on booking status
                        const statusColors = {
                          confirmed: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-100",
                          checked_in: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100",
                          checked_out: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100",
                          cancelled: "bg-slate-300 hover:bg-slate-400 text-slate-700 shadow-slate-100",
                        }[booking.status as "confirmed" | "checked_in" | "checked_out" | "cancelled"] || "bg-indigo-500 text-white";

                        return (
                          <div
                            key={booking.id}
                            onClick={() => onSelectGuest(booking.guestId)}
                            style={{
                              gridColumnStart: startGridCol,
                              gridColumnEnd: `span ${span}`,
                            }}
                            className={`absolute inset-y-2 mx-1 rounded-xl p-2 flex flex-col justify-center cursor-pointer transition-all shadow-sm hover:scale-[1.01] hover:shadow-md z-10 select-none overflow-hidden ${statusColors}`}
                            title={`Guest: ${booking.guestName} | Room: ${booking.roomNumber} (${booking.checkIn} to ${booking.checkOut})`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <User className="w-3 h-3 flex-shrink-0" />
                              <span className="text-[10px] font-bold truncate leading-none">
                                {booking.guestName}
                              </span>
                            </div>
                            <span className="text-[8px] opacity-90 truncate leading-none mt-1">
                              {booking.checkIn.substring(5)} to {booking.checkOut.substring(5)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500 block" />
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500 block" />
          Checked In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 block border border-emerald-100 text-emerald-600 font-bold px-1 py-0.5 text-[8px] leading-none uppercase">Out</span>
          Checked Out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-300 block" />
          Cancelled
        </span>
        <span className="ml-auto flex items-center gap-1 text-slate-400 italic">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          Click a reservation block to view guest&apos;s full file
        </span>
      </div>
    </div>
  );
}
