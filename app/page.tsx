"use client";

import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import GuestsList from "../components/GuestsList";
import GuestProfile from "../components/GuestProfile";
import CalendarTimeline from "../components/CalendarTimeline";
import { LogIn, LogOut, ShieldAlert, CheckCircle2, BedDouble, Users, DollarSign, Calendar, Compass } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Metrics
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [activeGuestsCount, setActiveGuestsCount] = useState(0);
  const [roomOccupancyRate, setRoomOccupancyRate] = useState(0);
  const [projectedRevenue, setProjectedRevenue] = useState(0);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setSelectedGuestId(null);
    });
    return () => unsubscribe();
  }, []);

  // Compute live dashboard metrics in real-time
  useEffect(() => {
    if (!user) return;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      let bookingsCount = 0;
      let activeGuests = 0;
      let occupiedRooms = new Set<string>();
      let revenueSum = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bookingsCount++;
        revenueSum += Number(data.totalAmount) || 0;

        if (data.status === "checked_in") {
          activeGuests++;
          if (data.roomNumber) {
            occupiedRooms.add(data.roomNumber);
          }
        }
      });

      setTotalBookingsCount(bookingsCount);
      setActiveGuestsCount(activeGuests);
      setProjectedRevenue(revenueSum);

      // We have 10 fixed rooms
      const rate = Math.round((occupiedRooms.size / 10) * 100);
      setRoomOccupancyRate(rate);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Ensure Google verified email
      if (!result.user.emailVerified) {
        await signOut(auth);
        setAuthError("Email verification is required. Please use an authenticated Google account.");
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("Google Sign-In failed or was interrupted by iframe restrictions.");
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" id="auth-loading-screen">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" id="login-screen">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-8 relative overflow-hidden"
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Innsphere CRM</h1>
            <p className="text-sm text-slate-500">Premium Reservation & Guest Management cockpit</p>
          </div>

          {authError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-xs text-red-600 font-medium">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01]"
              id="btn-google-sign-in"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google Account
            </button>
            <p className="text-center text-[10px] text-slate-400">
              Access is protected by authenticated Firestore attribute-based policies.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" id="crm-dashboard-root">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">Innsphere</h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Boutique Inn Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.displayName || "Innkeeper"}</p>
                <p className="text-[9px] text-indigo-600 font-medium mt-0.5 bg-indigo-50 px-1.5 py-0.5 rounded-full inline-block">Verified operator</p>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Avatar"}
                  className="w-8 h-8 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                  {user.email?.charAt(0)}
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
              title="Sign Out"
              id="btn-sign-out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Dashboard Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="metrics-dashboard-bar">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Bookings</p>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">{totalBookingsCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Guests</p>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">{activeGuestsCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lanes Occupancy</p>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">{roomOccupancyRate}%</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Log Revenue</p>
              <h3 className="text-lg font-bold text-slate-800 mt-0.5">${projectedRevenue}</h3>
            </div>
          </div>

        </div>

        {/* Bento Board Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Guest Registry */}
          <div className="lg:col-span-1 h-[600px]">
            <GuestsList
              onSelectGuest={setSelectedGuestId}
              selectedGuestId={selectedGuestId}
            />
          </div>

          {/* Right Columns: Calendar Timeline Scheduler or Guest Detailed File */}
          <div className="lg:col-span-2 min-h-[600px]">
            <AnimatePresence mode="wait">
              {selectedGuestId ? (
                <motion.div
                  key="guest-profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="h-full"
                >
                  <GuestProfile
                    guestId={selectedGuestId}
                    onClose={() => setSelectedGuestId(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="h-full"
                >
                  <CalendarTimeline
                    onSelectGuest={setSelectedGuestId}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>
    </div>
  );
}
