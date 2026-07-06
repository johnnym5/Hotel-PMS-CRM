"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Calendar as CalendarIcon,
  BedDouble,
  User,
  Mail,
  Phone,
  Trash2,
  Compass,
  CreditCard,
  History,
  Sparkles,
  Save,
  CheckCircle2,
  CalendarDays,
  X,
  Download,
  AlertCircle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO, differenceInDays } from "date-fns";
import { generatePDFReceipt } from "../lib/pdfUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  guestId: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  notes: string;
  ownerId?: string;
  incidentals?: { id: string; description: string; amount: number; date: string }[];
  groupId?: string;
}

interface GuestProfileData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface ClientPortalProps {
  user: any;
  activeTab: "book" | "bookings" | "profile";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ROOMS = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205"];
const DEFAULT_PRICE = 20000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientPortal({ user, activeTab }: ClientPortalProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guestProfile, setGuestProfile] = useState<GuestProfileData>({
    name: user?.displayName || user?.email?.split("@")[0] || "Valued Guest",
    email: user?.email || "",
    phone: "",
    notes: "",
  });

  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // New Booking form state
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState(
    () => format(new Date(Date.now() + 86400000), "yyyy-MM-dd")
  );
  const [specialNotes, setSpecialNotes] = useState("");

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: "", accountNumber: "", accountName: "",
  });
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  const isSandbox =
    user?.uid?.startsWith("sandbox_") ||
    (typeof window !== "undefined" &&
      localStorage.getItem("innsphere_sandbox_mode") === "true");

  // ── Load rooms ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSandbox) return;
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      setAvailableRooms(snap.docs.map((d) => d.data()));
    });
    return () => unsub();
  }, [isSandbox]);

  // ── Load bank details ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isSandbox) {
      const raw = localStorage.getItem("innsphere_sandbox_settings");
      if (raw) {
        try {
          const settings = JSON.parse(raw);
          if (settings.paymentDetails) setBankDetails(settings.paymentDetails);
        } catch {}
      }
      return;
    }
    const fetchBankDetails = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "main"));
        if (snap.exists() && snap.data().paymentDetails) {
          setBankDetails(snap.data().paymentDetails as BankDetails);
        }
      } catch (e) {
        console.error("Error loading bank details:", e);
      }
    };
    fetchBankDetails();
  }, [isSandbox]);

  // ── Load guest profile + bookings ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    if (isSandbox) {
      const load = () => {
        try {
          const rawGuests = localStorage.getItem("innsphere_sandbox_guests");
          const allGuests: any[] = rawGuests ? JSON.parse(rawGuests) : [];
          let myProfile = allGuests.find((g) => g.id === user.uid);
          if (!myProfile) {
            myProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Valued Guest",
              email: user.email || "",
              phone: "",
              notes: "Self-registered client sandbox",
              ownerId: user.uid,
            };
            allGuests.push(myProfile);
            localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(allGuests));
          }
          setGuestProfile({
            name: myProfile.name,
            email: myProfile.email,
            phone: myProfile.phone || "",
            notes: myProfile.notes || "",
          });

          const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
          const all: Booking[] = rawBookings ? JSON.parse(rawBookings) : [];
          const mine = all
            .filter((b) => b.guestId === user.uid || b.ownerId === user.uid)
            .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
          setBookings(mine);
        } catch (e) {
          console.error("Sandbox load error", e);
        } finally {
          setLoadingBookings(false);
        }
      };

      load();
      window.addEventListener("storage", load);
      window.addEventListener("innsphere_local_update", load);
      return () => {
        window.removeEventListener("storage", load);
        window.removeEventListener("innsphere_local_update", load);
      };
    }

    // Firestore
    const initProfile = async () => {
      try {
        const ref = doc(db, "guests", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          setGuestProfile({
            name: d.name || "",
            email: d.email || "",
            phone: d.phone || "",
            notes: d.notes || "",
          });
        } else {
          await setDoc(ref, {
            name: user.displayName || user.email?.split("@")[0] || "Valued Guest",
            email: user.email || "",
            phone: "",
            notes: "Self-registered client",
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error("Profile init error:", e);
      }
    };
    initProfile();

    const q = query(collection(db, "bookings"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: Booking[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            guestId: data.guestId || "",
            guestName: data.guestName || "",
            roomNumber: data.roomNumber || "",
            checkIn: data.checkIn || "",
            checkOut: data.checkOut || "",
            status: data.status || "confirmed",
            totalAmount: Number(data.totalAmount) || 0,
            notes: data.notes || "",
            ownerId: data.ownerId || "",
          };
        });
        loaded.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
        setBookings(loaded);
        setLoadingBookings(false);
      },
      (err) => {
        console.error("Booking stream error:", err);
        setLoadingBookings(false);
      }
    );
    return () => unsub();
  }, [user, isSandbox]);

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setProfileSaving(true);
    try {
      if (isSandbox) {
        const raw = localStorage.getItem("innsphere_sandbox_guests");
        const all: any[] = raw ? JSON.parse(raw) : [];
        const updated = all.map((g) =>
          g.id === user.uid ? { ...g, ...guestProfile } : g
        );
        localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
        setActionSuccess("Profile saved!");
        setTimeout(() => setActionSuccess(null), 3000);
        return;
      }
      await updateDoc(doc(db, "guests", user.uid), {
        ...guestProfile,
        updatedAt: serverTimestamp(),
      });
      setActionSuccess("Profile saved!");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError("Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Book room ───────────────────────────────────────────────────────────────
  const handleBookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setActionError("Please provide valid check-in and check-out dates.");
      return;
    }
    if (checkIn < format(new Date(), "yyyy-MM-dd")) {
      setActionError("Check-in date cannot be in the past.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));

      if (selectedRooms.length === 0) {
        setActionError("Please select at least one room.");
        setBookingSubmitting(false);
        return;
      }

      const groupId = selectedRooms.length > 1 ? "group_" + Date.now() : undefined;

      if (isSandbox) {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];

        for (const rm of selectedRooms) {
          const dynamicRoom = availableRooms.find(r => r.roomNumber === rm);
          const rate = dynamicRoom ? dynamicRoom.price : DEFAULT_PRICE;
          const totalAmount = nights * rate;

          allBookings.push({
            id: "booking_" + Date.now() + "_" + rm,
            guestId: user.uid,
            guestName: guestProfile.name,
            roomNumber: rm,
            checkIn: checkIn,
            checkOut: checkOut,
            status: "confirmed",
            totalAmount: totalAmount,
            notes: specialNotes || "",
            ownerId: user.uid,
            incidentals: [],
            groupId,
          });
        }

        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(allBookings));
        
        window.dispatchEvent(new Event("innsphere_local_update"));

        setSpecialNotes("");
        setSelectedRooms([]);
        setActionSuccess(`${selectedRooms.length} room(s) successfully reserved for ${nights} nights!`);
        
        setTimeout(() => {
          setActionSuccess(null);
        }, 1500);
        return;
      }

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

      for (const rm of selectedRooms) {
        const dynamicRoom = availableRooms.find(r => r.roomNumber === rm);
        const rate = dynamicRoom ? dynamicRoom.price : DEFAULT_PRICE;
        const totalAmount = nights * rate;

        const bookingDocRef = doc(collection(db, "bookings"));
        await setDoc(bookingDocRef, {
          guestId: user.uid,
          guestName: guestProfile.name,
          roomNumber: rm,
          checkIn: checkIn,
          checkOut: checkOut,
          status: "confirmed",
          totalAmount: totalAmount,
          notes: specialNotes || "",
          ownerId: user.uid,
          incidentals: [],
          groupId: groupId || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setSpecialNotes("");
      setSelectedRooms([]);
      setActionSuccess(`${selectedRooms.length} room(s) successfully reserved for ${nights} nights!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      console.error(e);
      setActionError("Reservation failed. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // ── Cancel booking ──────────────────────────────────────────────────────────
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      if (isSandbox) {
        const raw = localStorage.getItem("innsphere_sandbox_bookings");
        const all: any[] = raw ? JSON.parse(raw) : [];
        const updated = all.map((b) =>
          b.id === bookingId ? { ...b, status: "cancelled" } : b
        );
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
        setActionSuccess("Reservation cancelled.");
        setTimeout(() => setActionSuccess(null), 3000);
        return;
      }
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      setActionSuccess("Reservation cancelled.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError("Failed to cancel reservation.");
    }
  };

  // ── Manual transfer submitted ────────────────────────────────────────────────
  const handleManualTransferSubmitted = async () => {
    if (!selectedBookingForPayment) return;
    setPaymentActionLoading(true);
    try {
      if (isSandbox) {
        const raw = localStorage.getItem("innsphere_sandbox_bookings");
        const all: any[] = raw ? JSON.parse(raw) : [];
        const updated = all.map((b) =>
          b.id === selectedBookingForPayment.id ? { ...b, paymentStatus: "waiting" } : b
        );
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(updated));

        const rawNotifs = localStorage.getItem("innsphere_sandbox_notifications");
        const notifs: any[] = rawNotifs ? JSON.parse(rawNotifs) : [];
        notifs.unshift({
          id: "notif_" + Date.now(),
          recipientId: "staff_all",
          title: "Payment Pending Confirmation",
          message: `${guestProfile.name} has submitted a manual transfer for Room ${selectedBookingForPayment.roomNumber} (₦${(selectedBookingForPayment.totalAmount || 0).toLocaleString("en-NG")}).`,
          type: "payment",
          relatedBookingId: selectedBookingForPayment.id,
          status: "unread",
          actionState: "pending",
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("innsphere_sandbox_notifications", JSON.stringify(notifs));
        window.dispatchEvent(new Event("innsphere_local_update"));
      } else {
        await updateDoc(doc(db, "bookings", selectedBookingForPayment.id), {
          paymentStatus: "waiting",
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, "notifications"), {
          recipientId: "staff_all",
          title: "Payment Pending Confirmation",
          message: `${guestProfile.name} has submitted a manual transfer for Room ${selectedBookingForPayment.roomNumber} (₦${(selectedBookingForPayment.totalAmount || 0).toLocaleString("en-NG")}).`,
          type: "payment",
          relatedBookingId: selectedBookingForPayment.id,
          status: "unread",
          actionState: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setShowPaymentModal(false);
      setSelectedBookingForPayment(null);
      setActionSuccess("Transfer submitted! Staff will confirm your payment shortly.");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      console.error(e);
      setActionError("Failed to submit payment. Please try again.");
    } finally {
      setPaymentActionLoading(false);
    }
  };

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = async (booking: Booking) => {
    const elementId = `receipt-${booking.id}`;
    await generatePDFReceipt(elementId, `Receipt_Room${booking.roomNumber}.pdf`);
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const firstSelectedRoom = selectedRooms.length > 0 ? selectedRooms[0] : null;
  const currentDynamicRoom = firstSelectedRoom ? availableRooms.find(r => r.roomNumber === firstSelectedRoom) : null;
  const pricePerNight = currentDynamicRoom ? currentDynamicRoom.price : DEFAULT_PRICE;
  const stayNights = checkIn && checkOut && checkOut > checkIn 
    ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) 
    : 0;
  const calculatedTotal = stayNights * pricePerNight * selectedRooms.length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50" id="client-portal-root">
      <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6">

        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-800">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <BedDouble className="w-64 h-64" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              Welcome to the Inn
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bonjour, {guestProfile.name}!
            </h2>
            <p className="text-slate-300 text-sm max-w-lg font-light leading-relaxed">
              Design your perfect stay in our boutique rooms. View schedules, update your preferences, and manage bookings anytime.
            </p>
          </div>
        </div>

        {/* Feedback toasts */}
        <AnimatePresence>
          {actionError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
              <button onClick={() => setActionError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          {actionSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-4 py-3 text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {actionSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">

          {/* ── TAB: BOOK ROOM ── */}
          {activeTab === "book" && (
            <motion.div
              key="book"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <BedDouble className="w-4 h-4 text-indigo-600" /> Room Reservation Panel
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select dates, lock down your favourite room, and confirm your booking instantly.
                </p>
              </div>

              <form onSubmit={handleBookRoom} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  {/* Room picker */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Choose Room(s)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(availableRooms.length > 0 ? availableRooms.filter((r: any) => r.status === "active") : DEFAULT_ROOMS.map(r => ({ roomNumber: r, price: DEFAULT_PRICE }))).map((roomObj: any) => {
                        const rNum = roomObj.roomNumber;
                        const rRate = roomObj.price || DEFAULT_PRICE;
                        const isSelected = selectedRooms.includes(rNum);
                        return (
                        <button
                          key={rNum}
                          type="button"
                          onClick={() => {
                            setSelectedRooms(prev =>
                              prev.includes(rNum)
                                ? prev.filter(r => r !== rNum)
                                : [...prev, rNum]
                            );
                          }}
                          className={`p-3 rounded-xl border font-mono text-xs font-extrabold transition-all text-center flex flex-col items-center gap-1 ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm" 
                              : "border-slate-100 text-slate-600 hover:border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <span>{rNum}</span>
                          <span className="text-[9px] text-slate-400 font-normal font-sans">₦{rRate.toLocaleString('en-NG')}/n</span>
                        </button>
                      )})}
                    </div>
                    {selectedRooms.length > 1 && (
                      <p className="text-[10px] text-indigo-600 font-semibold">Group booking: {selectedRooms.length} rooms selected</p>
                    )}
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Special Requests / Notes
                    </label>
                    <textarea
                      placeholder="Extra pillows, allergies, early check-in, etc."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Invoice summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Invoice Breakdown
                    </h4>
                    {stayNights > 0 && selectedRooms.length > 0 ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Per Room Rate ({selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''})</span>
                          <span className="font-bold text-slate-700">₦{pricePerNight.toLocaleString('en-NG')} / night</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Duration</span>
                          <span className="font-bold text-slate-700">{stayNights} night(s)</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200">
                          <span className="text-slate-400">Tourism Tax (10%)</span>
                          <span className="font-bold text-slate-700">
                            ₦{Math.round(calculatedTotal * 0.1).toLocaleString("en-NG")}
                          </span>
                        </div>
                        <div className="flex justify-between pt-4 text-sm font-bold">
                          <span className="text-indigo-600">Total Charged</span>
                          <span className="text-lg font-extrabold text-indigo-600">
                            ₦{(calculatedTotal + Math.round(calculatedTotal * 0.1)).toLocaleString("en-NG")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-4">
                        <CalendarDays className="w-8 h-8 text-slate-300 stroke-1 mb-2" />
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                          Select dates to compute invoice
                        </p>
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
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

          {/* ── TAB: MY BOOKINGS ── */}
          {activeTab === "bookings" && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <History className="w-4 h-4 text-indigo-600" /> My Booking History
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Track your stay timeline, room numbers, and payment status.
                </p>
              </div>

              {loadingBookings ? (
                <div className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    Loading Records...
                  </p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <BedDouble className="w-8 h-8 text-slate-300 stroke-1" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      No bookings found
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Use the &quot;Reserve Room&quot; tab to book your first room!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const nights = differenceInDays(
                      parseISO(booking.checkOut),
                      parseISO(booking.checkIn)
                    );
                    return (
                      <div
                        key={booking.id}
                        className="bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Left: info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-[10px] text-slate-400 uppercase font-bold leading-none">
                              Room
                            </span>
                            <span className="text-base font-extrabold font-mono text-indigo-600 leading-none mt-1">
                              {booking.roomNumber}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">
                                Boutique Suite {booking.roomNumber}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  booking.status === "confirmed"
                                    ? "bg-indigo-50 text-indigo-600"
                                    : booking.status === "checked_in"
                                    ? "bg-amber-50 text-amber-600 animate-pulse"
                                    : booking.status === "checked_out"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-red-50 text-red-500"
                                }`}
                              >
                                {booking.status.replace("_", " ")}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                  booking.paymentStatus === "paid"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                    : booking.paymentStatus === "waiting"
                                    ? "border-amber-200 bg-amber-50 text-amber-600"
                                    : "border-red-200 bg-red-50 text-red-600"
                                }`}
                              >
                                {booking.paymentStatus === "waiting"
                                  ? "Confirming Payment"
                                  : booking.paymentStatus || "pending"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {format(parseISO(booking.checkIn), "MMM dd, yyyy")} →{" "}
                              {format(parseISO(booking.checkOut), "MMM dd, yyyy")} ({nights}{" "}
                              {nights === 1 ? "night" : "nights"})
                            </p>
                            {booking.notes && (
                              <p className="text-[10px] text-slate-400 italic bg-white/70 px-2 py-1 rounded border border-slate-100 inline-block">
                                &quot;{booking.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: amount + actions */}
                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                              Total Amount
                            </span>
                            <span className="text-sm font-extrabold text-slate-800">
                              ₦{(booking.totalAmount || 0).toLocaleString("en-NG")}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {/* Pay Now — only if pending and not cancelled */}
                            {(!booking.paymentStatus || booking.paymentStatus === "pending") &&
                              booking.status !== "cancelled" && (
                                <button
                                  onClick={() => {
                                    setSelectedBookingForPayment(booking);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                                >
                                  Pay Now
                                </button>
                              )}

                            {/* Download Receipt — only if paid */}
                            {booking.paymentStatus === "paid" && (
                              <>
                                <button
                                  onClick={() => handleDownloadPDF(booking)}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <Download className="w-3 h-3" />
                                  Receipt
                                </button>
                                {/* Hidden receipt DOM node for PDF capture */}
                                <div
                                  id={`receipt-${booking.id}`}
                                  style={{ display: "none" }}
                                  className="p-8 bg-white w-[600px] font-sans"
                                >
                                  <div className="text-center mb-6">
                                    <h1 className="text-2xl font-extrabold text-slate-800">
                                      Innsphere Hotel
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-1">Official Payment Receipt</p>
                                  </div>
                                  <div className="space-y-2 text-sm border-t border-slate-200 pt-4">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Guest Name</span>
                                      <span className="font-bold">{guestProfile.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Room</span>
                                      <span className="font-bold">{booking.roomNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Check-in</span>
                                      <span className="font-bold">
                                        {format(parseISO(booking.checkIn), "MMM dd, yyyy")}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Check-out</span>
                                      <span className="font-bold">
                                        {format(parseISO(booking.checkOut), "MMM dd, yyyy")}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-base font-extrabold border-t border-slate-200 pt-3 mt-3">
                                      <span>Total Paid</span>
                                      <span className="text-indigo-600">
                                        ₦{(booking.totalAmount || 0).toLocaleString("en-NG")}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-center text-xs text-slate-400 mt-6">
                                    Thank you for staying with us!
                                  </p>
                                </div>
                              </>
                            )}

                            {/* Cancel — only if confirmed */}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="px-3 py-1.5 bg-white border border-red-100 hover:bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── TAB: PROFILE ── */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-600" /> Guest Preferences & Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure your contact details and room preferences.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={guestProfile.name}
                        onChange={(e) =>
                          setGuestProfile({ ...guestProfile, name: e.target.value })
                        }
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={guestProfile.phone}
                        placeholder="+1 (555) 019-2834"
                        onChange={(e) =>
                          setGuestProfile({ ...guestProfile, phone: e.target.value })
                        }
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Email Address (Read-only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={guestProfile.email}
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Permanent Stay Notes / Room Preferences
                  </label>
                  <textarea
                    placeholder="Allergies, preferred pillows, high-floor preference, etc."
                    value={guestProfile.notes}
                    onChange={(e) =>
                      setGuestProfile({ ...guestProfile, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">
                    These details are synced with our staff, ensuring a customized experience on every stay.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
                  >
                    {profileSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* ── Payment Modal ── */}
      <AnimatePresence>
        {showPaymentModal && selectedBookingForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md relative"
            >
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedBookingForPayment(null);
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-bold text-slate-800 mb-1">Complete Payment</h3>
              <p className="text-xs text-slate-500 mb-6">
                Transfer the total amount to the bank details below to confirm your booking.
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 mb-6 text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Amount Due:</span>
                  <span className="text-indigo-600 font-extrabold">
                    ₦{(selectedBookingForPayment.totalAmount || 0).toLocaleString("en-NG")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Bank Name:</span>
                  <span className="text-slate-800 font-bold">
                    {bankDetails.bankName || "Not configured — contact staff"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Account Number:</span>
                  <span className="text-slate-800 font-bold font-mono tracking-wider">
                    {bankDetails.accountNumber || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Account Name:</span>
                  <span className="text-slate-800 font-bold">
                    {bankDetails.accountName || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  After transferring, click the button below. Our staff will verify and confirm your payment within 24 hours.
                </p>
              </div>

              <button
                onClick={handleManualTransferSubmitted}
                disabled={paymentActionLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow shadow-indigo-200"
              >
                {paymentActionLoading ? "Processing..." : "I have transferred the funds"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
