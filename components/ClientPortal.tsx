"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { 
  Calendar as CalendarIcon, 
  BedDouble, 
  User, 
  Mail, 
  Phone, 
  Plus, 
  Trash2, 
  LogOut, 
  Compass, 
  CreditCard, 
  History, 
  Sparkles, 
  Clock, 
  Heart, 
  MapPin, 
  Save, 
  CheckCircle2, 
  Info, 
  CalendarDays,
  Utensils,
  X,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";

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
  ownerId?: string;
}

interface GuestProfileData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface ClientPortalProps {
  user: any;
  activeTab: "book" | "bookings" | "profile";
}

const ROOMS = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205"];
const ROOM_PRICES: Record<string, number> = {
  "101": 19800,
  "102": 20625,
  "103": 21450,
  "104": 22275,
  "105": 23100,
  "201": 26400,
  "202": 27225,
  "203": 28050,
  "204": 28875,
  "205": 30525,
};

export default function ClientPortal({ user, activeTab }: ClientPortalProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guestProfile, setGuestProfile] = useState<GuestProfileData>({
    name: user.displayName || user.email?.split("@")[0] || "Valued Guest",
    email: user.email || "",
    phone: "",
    notes: ""
  });
  
  // Loading and action feedback
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // New Booking form state
  const [roomNumber, setRoomNumber] = useState("101");
  const [checkIn, setCheckIn] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState(() => format(new Date(Date.now() + 86400000), "yyyy-MM-dd"));
  const [specialNotes, setSpecialNotes] = useState("");

  const isSandbox = user?.uid?.startsWith("sandbox_") || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");

  // Setup guest profile and listen to personal bookings
  useEffect(() => {
    if (!isSandbox) {
      const q = query(collection(db, "rooms"));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setAvailableRooms(snapshot.docs.map(d => d.data()));
        } else {
          setAvailableRooms([]);
        }
      });
      return () => unsub();
    }
  }, [isSandbox]);

  useEffect(() => {
    if (!user) return;

    if (isSandbox) {
      const loadSandboxClientData = () => {
        try {
          // Setup guest profile in local storage if not already there
          const rawGuests = localStorage.getItem("innsphere_sandbox_guests");
          const allGuests: any[] = rawGuests ? JSON.parse(rawGuests) : [];
          let myProfile = allGuests.find(g => g.id === user.uid);
          
          if (!myProfile) {
            myProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Valued Guest",
              email: user.email || "",
              phone: "",
              notes: "Self-registered client sandbox",
              ownerId: user.uid
            };
            allGuests.push(myProfile);
            localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(allGuests));
          }

          setGuestProfile({
            name: myProfile.name,
            email: myProfile.email,
            phone: myProfile.phone || "",
            notes: myProfile.notes || ""
          });

          // Setup bookings
          const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
          const allBookings: Booking[] = rawBookings ? JSON.parse(rawBookings) : [];
          const myBookings = allBookings.filter(b => b.guestId === user.uid || b.ownerId === user.uid);
          myBookings.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
          setBookings(myBookings);
          setLoadingBookings(false);
        } catch (e) {
          console.error("Error setting up sandbox client profile", e);
          setLoadingBookings(false);
        }
      };

      loadSandboxClientData();

      const handleStorageChange = () => {
        loadSandboxClientData();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("innsphere_local_update", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("innsphere_local_update", handleStorageChange);
      };
    } else {
      // 1. Fetch/Create guest profile document with ID == user.uid
      const initProfile = async () => {
        try {
          const guestDocRef = doc(db, "guests", user.uid);
          const guestDoc = await getDoc(guestDocRef);
          
          if (guestDoc.exists()) {
            const data = guestDoc.data();
            setGuestProfile({
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              notes: data.notes || ""
            });
          } else {
            // Auto create guest profile so booking rules work flawlessly
            await setDoc(guestDocRef, {
              name: user.displayName || user.email?.split("@")[0] || "Valued Guest",
              email: user.email || "",
              phone: "",
              notes: "Self-registered client",
              ownerId: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Error setting up guest profile:", err);
        }
      };

      initProfile();

      // 2. Stream user bookings
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid)
      );

      const unsubscribe = onSnapshot(
        bookingsQuery,
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
              notes: data.notes || ""
            });
          });
          
          // Sort bookings by check-in date
          loadedBookings.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
          setBookings(loadedBookings);
          setLoadingBookings(false);
        },
        (err) => {
          console.error("Error loading bookings:", err);
          setLoadingBookings(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, isSandbox]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setProfileSaving(true);

    try {
      if (isSandbox) {
        const rawGuests = localStorage.getItem("innsphere_sandbox_guests");
        const allGuests: any[] = rawGuests ? JSON.parse(rawGuests) : [];
        const updated = allGuests.map(g => {
          if (g.id === user.uid) {
            return {
              ...g,
              name: guestProfile.name,
              email: guestProfile.email,
              phone: guestProfile.phone,
              notes: guestProfile.notes,
            };
          }
          return g;
        });
        localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
        setActionSuccess("Your profile has been saved successfully!");
        setTimeout(() => setActionSuccess(null), 3000);
        return;
      }

      const guestDocRef = doc(db, "guests", user.uid);
      await updateDoc(guestDocRef, {
        name: guestProfile.name,
        email: guestProfile.email,
        phone: guestProfile.phone,
        notes: guestProfile.notes,
        updatedAt: serverTimestamp()
      });
      setActionSuccess("Your profile has been saved successfully!");
      
      // Clear success alert after 3 seconds
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError("Failed to update profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Book Room
  const handleBookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    // Basic date validations
    if (!checkIn || !checkOut) {
      setActionError("Please provide both check-in and check-out dates.");
      return;
    }

    if (checkIn >= checkOut) {
      setActionError("Check-out date must be after the check-in date.");
      return;
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (checkIn < todayStr) {
      setActionError("Check-in date cannot be in the past.");
      return;
    }

    setBookingSubmitting(true);

    try {
      const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
      const dynamicRoom = availableRooms.find(r => r.roomNumber === roomNumber);
      const rate = dynamicRoom ? dynamicRoom.rate : (ROOM_PRICES[roomNumber] || 150);
      const totalAmount = nights * rate;

      if (isSandbox) {
        const newBooking = {
          id: "booking_" + Date.now(),
          guestId: user.uid,
          guestName: guestProfile.name,
          roomNumber: roomNumber,
          checkIn: checkIn,
          checkOut: checkOut,
          status: "confirmed",
          totalAmount: totalAmount,
          notes: specialNotes || "",
          ownerId: user.uid
        };

        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
        allBookings.push(newBooking);
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(allBookings));
        
        window.dispatchEvent(new Event("innsphere_local_update"));

        // Clear Form state
        setSpecialNotes("");
        setActionSuccess(`Room ${roomNumber} successfully reserved for ${nights} nights!`);
        
        // Auto-transition is handled by parent now
        setTimeout(() => {
          setActionSuccess(null);
        }, 1500);
        return;
      }

      // Ensure guest profile exists in case it was somehow deleted or failed earlier
      const guestDocRef = doc(db, "guests", user.uid);
      const guestDoc = await getDoc(guestDocRef);
      if (!guestDoc.exists()) {
        await setDoc(guestDocRef, {
          name: guestProfile.name,
          email: guestProfile.email,
          phone: guestProfile.phone,
          notes: guestProfile.notes,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Create Booking Document
      const bookingDocRef = doc(collection(db, "bookings"));
      await setDoc(bookingDocRef, {
        guestId: user.uid,
        guestName: guestProfile.name,
        roomNumber: roomNumber,
        checkIn: checkIn,
        checkOut: checkOut,
        status: "confirmed",
        totalAmount: totalAmount,
        notes: specialNotes || "",
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Clear Form state
      setSpecialNotes("");
      setActionSuccess(`Room ${roomNumber} successfully reserved for ${nights} nights!`);
      
      // Auto-transition is handled by parent now
      setTimeout(() => {
        setActionSuccess(null);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setActionError("Reservation failed. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    
    setActionError(null);
    setActionSuccess(null);

    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        status: "cancelled",
        updatedAt: serverTimestamp()
      });
      setActionSuccess("Reservation cancelled successfully.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError("Failed to cancel reservation. Please try again.");
    }
  };

  // Helper values for totals
  const currentDynamicRoom = availableRooms.find(r => r.roomNumber === roomNumber);
  const pricePerNight = currentDynamicRoom ? currentDynamicRoom.rate : (ROOM_PRICES[roomNumber] || 150);
  const stayNights = checkIn && checkOut && checkOut > checkIn 
    ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) 
    : 0;
  const calculatedTotal = stayNights * pricePerNight;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" id="client-portal-root">
      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
        
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-800">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <BedDouble className="w-64 h-64" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-indigo-300 animate-spin" />
              Welcome to the Inn
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Bonjour, {guestProfile.name}!</h2>
            <p className="text-slate-300 text-sm max-w-lg font-light leading-relaxed">
              Design your perfect stay in our boutique rooms. View schedules, update your custom preferences, and manage bookings anytime.
            </p>
          </div>
        </div>

        {/* Action feedback */}
        <AnimatePresence mode="wait">
          {actionError && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          
          {/* TAB 1: BOOK ROOM */}
          {activeTab === "book" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <BedDouble className="w-4 h-4 text-indigo-600" /> Room Reservation Panel
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select dates, lock down your favourite room, and confirm your booking instantly.</p>
              </div>

              <form onSubmit={handleBookRoom} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Form fields */}
                <div className="space-y-5">
                  
                  {/* Select Room */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Choose a Room</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(availableRooms.length > 0 ? availableRooms : ROOMS.map(r => ({ roomNumber: r, rate: ROOM_PRICES[r] }))).map((roomObj) => {
                        const rNum = typeof roomObj === "string" ? roomObj : roomObj.roomNumber;
                        const rRate = typeof roomObj === "string" ? ROOM_PRICES[rNum] : roomObj.rate;
                        return (
                        <button
                          key={rNum}
                          type="button"
                          onClick={() => setRoomNumber(rNum)}
                          className={`p-3 rounded-xl border font-mono text-xs font-extrabold transition-all text-center flex flex-col items-center gap-1 ${
                            roomNumber === rNum 
                              ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" 
                              : "border-slate-100 text-slate-600 hover:border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <span>{rNum}</span>
                          <span className="text-[9px] text-slate-400 font-normal font-sans">${rRate}/n</span>
                        </button>
                      )})}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Check-in Date</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Check-out Date</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Special Requests / Notes</label>
                    <textarea
                      placeholder="Extra pillows, specific allergies, early check-in requests, etc."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>

                </div>

                {/* Calculation Summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Invoice Breakdown
                    </h4>

                    {stayNights > 0 ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Room {roomNumber} Suite Rate</span>
                          <span className="font-bold text-slate-700">₦{pricePerNight.toLocaleString('en-NG')} / night</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Duration of Getaway</span>
                          <span className="font-bold text-slate-700">{stayNights} nights</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Boutique Tourism Tax (10%)</span>
                          <span className="font-bold text-slate-700">₦{Math.round(calculatedTotal * 0.1).toLocaleString('en-NG')}</span>
                        </div>
                        <div className="flex justify-between pt-4 text-sm font-bold text-slate-800">
                          <span className="text-indigo-600">Total Charged</span>
                          <span className="text-lg font-extrabold text-indigo-600">₦{(calculatedTotal + Math.round(calculatedTotal * 0.1)).toLocaleString('en-NG')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-4">
                        <CalendarDays className="w-8 h-8 text-slate-300 stroke-1 mb-2 animate-bounce" />
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Select valid check-in / check-out dates to compute invoice</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting || stayNights <= 0}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    {bookingSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Booking
                      </>
                    )}
                  </button>

                </div>

              </form>
            </motion.div>
          )}

          {/* TAB 2: MY BOOKINGS */}
          {activeTab === "bookings" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <History className="w-4 h-4 text-indigo-600" /> My Booking History
                </h3>
                <p className="text-xs text-slate-400 mt-1">Keep track of your stay timeline, room numbers, and transaction logs.</p>
              </div>

              {loadingBookings ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Loading Records...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <BedDouble className="w-8 h-8 text-slate-300 stroke-1" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">No bookings found</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the &quot;Reserve Room&quot; tab to book your first room!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const nights = differenceInDays(parseISO(booking.checkOut), parseISO(booking.checkIn));
                    return (
                      <div 
                        key={booking.id}
                        className="bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex flex-col items-center justify-center text-slate-600 shadow-sm flex-shrink-0">
                            <span className="text-[10px] text-slate-400 uppercase font-bold leading-none">Room</span>
                            <span className="text-base font-extrabold font-mono text-indigo-600 leading-none mt-1">{booking.roomNumber}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">Boutique Suite {booking.roomNumber}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                booking.status === "confirmed" ? "bg-indigo-50 text-indigo-600" :
                                booking.status === "checked_in" ? "bg-amber-50 text-amber-600 animate-pulse" :
                                booking.status === "checked_out" ? "bg-slate-100 text-slate-500" :
                                "bg-red-50 text-red-500"
                              }`}>
                                {booking.status.replace("_", " ")}
                              </span>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              {format(parseISO(booking.checkIn), "MMM dd, yyyy")} to {format(parseISO(booking.checkOut), "MMM dd, yyyy")} ({nights} {nights === 1 ? 'night' : 'nights'})
                            </p>

                            {booking.notes && (
                              <p className="text-[10px] text-slate-400 italic bg-white/70 px-2 py-1 rounded border border-slate-100 inline-block">
                                &quot;{booking.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Paid</span>
                            <span className="text-sm font-extrabold text-slate-800">₦{booking.totalAmount.toLocaleString('en-NG')}</span>
                          </div>

                          {booking.status === "confirmed" && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="px-3 py-1.5 bg-white border border-red-100 hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: PREFERENCES & PROFILE */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" /> Guest Preferences & Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure your contact details and custom room setup options.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={guestProfile.name}
                        onChange={(e) => setGuestProfile({ ...guestProfile, name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={guestProfile.phone}
                        placeholder="+1 (555) 019-2834"
                        onChange={(e) => setGuestProfile({ ...guestProfile, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={guestProfile.email}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-400 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permanent Stay Notes / Room Preferences</label>
                  <textarea
                    placeholder="Allergies, preferred pillows, high-floor preference, coffee setup, etc."
                    value={guestProfile.notes}
                    onChange={(e) => setGuestProfile({ ...guestProfile, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">These details are synced with our operational staff, ensuring a customized experience on every stay.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
                  >
                    {profileSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          )}

        </div>

      </main>
    </div>
  );
}
