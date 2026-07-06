"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, Plus, Trash2, X, AlertCircle, ShoppingBag, FileText, CheckCircle2, BedDouble, Printer, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getReceiptHTML } from "./ReceiptTemplate";
import { generatePDFReceipt } from "../lib/pdfUtils";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  ownerId: string;
}

interface Booking {
  id: string;
  guestId: string;
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  notes: string;
  incidentals?: { id: string; description: string; amount: number; date: string }[];
  groupId?: string;
}

interface GuestProfileProps {
  guestId: string;
  onClose: () => void;
}

export default function GuestProfile({ guestId, onClose }: GuestProfileProps) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Guest Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Add Booking Form state
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [status, setStatus] = useState("confirmed");

  // Folio / Incidentals state
  const [folioBookingId, setFolioBookingId] = useState<string | null>(null);
  const [incDescription, setIncDescription] = useState("");
  const [incAmount, setIncAmount] = useState("");

  // Available rooms for multi-select
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const isSandbox = !auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");
  const currentUserId = auth.currentUser?.uid || (typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_id") : null) || "sandbox_user";

  // Load available rooms
  useEffect(() => {
    if (isSandbox) {
      const loadRooms = () => {
        const raw = localStorage.getItem("innsphere_sandbox_rooms");
        setAvailableRooms(raw ? JSON.parse(raw) : []);
      };
      loadRooms();
      const handler = () => loadRooms();
      window.addEventListener("innsphere_local_update", handler);
      return () => window.removeEventListener("innsphere_local_update", handler);
    } else {
      if (!auth.currentUser) return;
      const unsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
        setAvailableRooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [isSandbox]);

  // Load Guest Details and Bookings
  useEffect(() => {
    if (!guestId) return;

    if (isSandbox) {
      setLoading(true);
      const loadLocalData = () => {
        try {
          // Load Guest
          const rawGuests = localStorage.getItem("innsphere_sandbox_guests");
          const allGuests: any[] = rawGuests ? JSON.parse(rawGuests) : [];
          const foundGuest = allGuests.find(g => g.id === guestId);
          if (foundGuest) {
            const loadedGuest = {
              id: foundGuest.id,
              name: foundGuest.name || "",
              email: foundGuest.email || "",
              phone: foundGuest.phone || "",
              notes: foundGuest.notes || "",
              ownerId: foundGuest.ownerId || "",
            };
            setGuest(loadedGuest);
            setName(loadedGuest.name);
            setEmail(loadedGuest.email);
            setPhone(loadedGuest.phone);
            setNotes(loadedGuest.notes);
            setError(null);
          } else {
            setGuest(null);
          }

          // Load Bookings
          const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
          const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
          const guestBookings = allBookings.filter(b => b.guestId === guestId);
          setBookings(guestBookings.sort((a, b) => b.checkIn.localeCompare(a.checkIn)));
          setLoading(false);
        } catch (e) {
          console.error("Error loading local profile", e);
          setLoading(false);
        }
      };

      loadLocalData();

      const handleStorageChange = () => {
        loadLocalData();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("innsphere_local_update", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("innsphere_local_update", handleStorageChange);
      };
    } else {
      if (!auth.currentUser) return;

      setLoading(true);
      const guestRef = doc(db, "guests", guestId);

      // Fetch guest details real-time
      const unsubGuest = onSnapshot(
        guestRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedGuest = {
              id: docSnap.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              notes: data.notes || "",
              ownerId: data.ownerId || "",
            };
            setGuest(loadedGuest);
            setName(loadedGuest.name);
            setEmail(loadedGuest.email);
            setPhone(loadedGuest.phone);
            setNotes(loadedGuest.notes);
            setError(null);
          } else {
            setGuest(null);
          }
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, `guests/${guestId}`);
          } catch (wrappedError) {
            setError("Failed to load guest profile. Access Denied.");
          }
        }
      );

      // Fetch guest's bookings
      const bookingsPath = "bookings";
      const bookingsQuery = query(
        collection(db, bookingsPath),
        where("guestId", "==", guestId),
        orderBy("checkIn", "desc")
      );

      const unsubBookings = onSnapshot(
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
              paymentStatus: data.paymentStatus || "paid",
              totalAmount: Number(data.totalAmount) || 0,
              notes: data.notes || "",
            });
          });
          setBookings(loadedBookings);
          setLoading(false);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, bookingsPath);
          } catch (wrappedError) {
            console.error("Failed to load bookings");
          }
        }
      );

      return () => {
        unsubGuest();
        unsubBookings();
      };
    }
  }, [guestId, isSandbox]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (isSandbox) {
      try {
        const rawGuests = localStorage.getItem("innsphere_sandbox_guests");
        const allGuests: any[] = rawGuests ? JSON.parse(rawGuests) : [];
        const updated = allGuests.map(g => {
          if (g.id === guest.id) {
            return {
              ...g,
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              notes: notes.trim(),
            };
          }
          return g;
        });
        localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
        setIsEditing(false);
      } catch (err) {
        setError("Failed to update profile locally.");
      }
      return;
    }

    if (!auth.currentUser) return;
    const path = `guests/${guest.id}`;
    try {
      setError(null);
      await updateDoc(doc(db, "guests", guest.id), {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (wrappedError: any) {
        setError("Permission Denied: Could not update profile.");
      }
    }
  };

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;
    if (selectedRooms.length === 0 || !checkIn || !checkOut) {
      setError("Room(s), Check-in, and Check-out are required.");
      return;
    }

    const groupId = selectedRooms.length > 1 ? "group_" + Date.now() : undefined;

    if (isSandbox) {
      try {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];

        for (const rm of selectedRooms) {
          const roomData = availableRooms.find(r => r.roomNumber === rm);
          const perRoomAmount = totalAmount ? Number(totalAmount) : (roomData?.price || 20000);
          allBookings.push({
            id: "booking_" + Date.now() + "_" + rm,
            guestId: guest.id,
            guestName: guest.name,
            roomNumber: rm,
            checkIn,
            checkOut,
            status,
            paymentStatus: "paid",
            totalAmount: perRoomAmount,
            notes: bookingNotes.trim() || "",
            ownerId: currentUserId,
            incidentals: [],
            groupId,
          });
        }
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(allBookings));
        window.dispatchEvent(new Event("innsphere_local_update"));

        setSelectedRooms([]);
        setCheckIn("");
        setCheckOut("");
        setTotalAmount("");
        setBookingNotes("");
        setStatus("confirmed");
        setIsAddingBooking(false);
        setError(null);
      } catch (err) {
        setError("Failed to create booking locally.");
      }
      return;
    }

    if (!auth.currentUser) return;
    try {
      setError(null);
      for (const rm of selectedRooms) {
        const roomData = availableRooms.find(r => r.roomNumber === rm);
        const perRoomAmount = totalAmount ? Number(totalAmount) : (roomData?.price || 20000);
        await addDoc(collection(db, "bookings"), {
          guestId: guest.id,
          guestName: guest.name,
          roomNumber: rm,
          checkIn,
          checkOut,
          status,
          paymentStatus: "paid",
          totalAmount: perRoomAmount,
          notes: bookingNotes.trim() || null,
          ownerId: auth.currentUser.uid,
          incidentals: [],
          groupId: groupId || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedRooms([]);
      setCheckIn("");
      setCheckOut("");
      setTotalAmount("");
      setBookingNotes("");
      setStatus("confirmed");
      setIsAddingBooking(false);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, "bookings");
      } catch (wrappedError: any) {
        setError("Permission Denied: Ensure all fields conform and you have write clearance.");
      }
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this reservation record?")) return;

    if (isSandbox) {
      try {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
        const filtered = allBookings.filter(b => b.id !== bookingId);
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(filtered));
        window.dispatchEvent(new Event("innsphere_local_update"));
      } catch (err) {
        setError("Failed to delete booking locally.");
      }
      return;
    }

    const path = `bookings/${bookingId}`;
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch (wrappedError: any) {
        setError("Permission Denied: Could not delete booking.");
      }
    }
  };

  const handlePrintReceipt = (booking: Booking) => {
    const html = getReceiptHTML(booking.guestName, booking.roomNumber, booking.checkIn, booking.checkOut, booking.totalAmount || 0, booking.incidentals);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async (booking: Booking) => {
    try {
      const html = getReceiptHTML(booking.guestName, booking.roomNumber, booking.checkIn, booking.checkOut, booking.totalAmount || 0, booking.incidentals);
      const tempDiv = document.createElement("div");
      tempDiv.id = "temp-receipt-" + booking.id;
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);
      await generatePDFReceipt(tempDiv.id, `Receipt_${booking.roomNumber}_${booking.checkIn}.pdf`);
      document.body.removeChild(tempDiv);
    } catch (e) {
      console.error(e);
      setError("Failed to generate PDF.");
    }
  };

  const handleAddIncidental = async (bookingId: string) => {
    if (!incDescription.trim() || !incAmount) {
      setError("Description and amount are required for incidentals.");
      return;
    }

    const newInc = {
      id: "inc_" + Date.now(),
      description: incDescription.trim(),
      amount: Number(incAmount),
      date: format(new Date(), "yyyy-MM-dd"),
    };

    if (isSandbox) {
      try {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
        const updated = allBookings.map(b => {
          if (b.id === bookingId) {
            const incs = [...(b.incidentals || []), newInc];
            const incTotal = incs.reduce((sum: number, i: any) => sum + i.amount, 0);
            return { ...b, incidentals: incs, totalAmount: (b.totalAmount - (b.incidentals || []).reduce((s: number, i: any) => s + i.amount, 0)) + incTotal };
          }
          return b;
        });
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
      } catch (err) {
        setError("Failed to add incidental.");
      }
    } else {
      try {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;
        const incs = [...(booking.incidentals || []), newInc];
        const incTotal = incs.reduce((sum, i) => sum + i.amount, 0);
        const baseAmount = booking.totalAmount - (booking.incidentals || []).reduce((s, i) => s + i.amount, 0);
        await updateDoc(doc(db, "bookings", bookingId), {
          incidentals: incs,
          totalAmount: baseAmount + incTotal,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        setError("Failed to add incidental.");
      }
    }

    setIncDescription("");
    setIncAmount("");
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (isSandbox) {
      try {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
        const updated = allBookings.map(b => {
          if (b.id === bookingId) {
            return { ...b, status: newStatus };
          }
          return b;
        });
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(updated));
        window.dispatchEvent(new Event("innsphere_local_update"));
      } catch (err) {
        setError("Failed to update booking status locally.");
      }
      return;
    }

    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (wrappedError: any) {
        setError("Permission Denied: Failed to update booking status.");
      }
    }
  };

  if (loading && !guest) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-xs text-slate-400">
        Loading guest profile details...
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-xs text-slate-400">
        No guest selected or profile was removed.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full overflow-hidden flex flex-col" id="guest-profile-card">
      {/* Title Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
            {guest.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 leading-none">{guest.name}</h2>
            <p className="text-[10px] text-indigo-600 mt-1 font-medium bg-indigo-50/70 px-2 py-0.5 rounded-full inline-block">VIP Guest</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-start gap-2 text-xs text-red-600 font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Scroller */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Profile Info Form / Summary */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.form
              onSubmit={handleUpdateProfile}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200"
            >
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Edit Contact Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Notes / Preferences</label>
                  <textarea
                    value={notes}
                    rows={3}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-5"
            >
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{guest.email || "No email on file"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{guest.phone || "No phone on file"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Special Preferences</h3>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[50px] text-xs text-slate-600 italic">
                  {guest.notes ? `"${guest.notes}"` : "No special preferences or accommodations noted."}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bookings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-slate-400" />
              Reservation Logs ({bookings.length})
            </h3>
            <button
              onClick={() => setIsAddingBooking(!isAddingBooking)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors"
              id="btn-add-booking-toggle"
            >
              {isAddingBooking ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isAddingBooking ? "Close" : "Book Room"}
            </button>
          </div>

          {/* Add Booking Modal Drawer */}
          <AnimatePresence>
            {isAddingBooking && (
              <motion.form
                onSubmit={handleAddBooking}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-4 space-y-4 overflow-hidden"
                id="form-add-booking"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Room(s) *</label>
                    {availableRooms.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableRooms.filter(r => r.status === "active").map((room: any) => (
                          <button
                            key={room.roomNumber}
                            type="button"
                            onClick={() => {
                              setSelectedRooms(prev =>
                                prev.includes(room.roomNumber)
                                  ? prev.filter(r => r !== room.roomNumber)
                                  : [...prev, room.roomNumber]
                              );
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                              selectedRooms.includes(room.roomNumber)
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            {room.roomNumber}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={selectedRooms.join(", ")}
                        onChange={(e) => setSelectedRooms(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. 101, 204"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    )}
                    {selectedRooms.length > 1 && (
                      <p className="text-[9px] text-indigo-600 font-semibold mt-1">Group booking: {selectedRooms.length} rooms selected</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Total Amount (₦)</label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Check In *</label>
                    <input
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Check Out *</label>
                    <input
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Reservation Notes</label>
                    <input
                      type="text"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Late arrival, twin beds, etc."
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-indigo-100 pt-3">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Confirm Reservation
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Bookings Timeline/List */}
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                No bookings registered for this guest. Click &quot;Book Room&quot; above to reserve.
              </div>
            ) : (
            bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`bg-white border rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-200 transition-all ${booking.groupId ? "border-l-4 border-l-violet-400 border-slate-100" : "border-slate-100"}`}
                  id={`booking-card-${booking.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-[10px] text-slate-700">
                        Room {booking.roomNumber}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        booking.status === "checked_in" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        booking.status === "checked_out" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        booking.status === "cancelled" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                        "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      {booking.groupId && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-violet-50 text-violet-600 border border-violet-100 uppercase">
                          Group
                        </span>
                      )}
                      {booking.paymentStatus === "pending" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 border border-red-100 uppercase">
                          Pending Payment
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {booking.checkIn} to {booking.checkOut}
                      </span>
                      {booking.status === "checked_in" && (
                        <span className={`text-[11px] font-bold ${
                          differenceInDays(parseISO(booking.checkOut), startOfDay(new Date())) <= 0 ? "text-red-600" : "text-indigo-600"
                        }`}>
                          Days Left: {Math.max(0, differenceInDays(parseISO(booking.checkOut), startOfDay(new Date())))}
                        </span>
                      )}
                      {booking.totalAmount > 0 && (
                        <span className="font-semibold text-emerald-600 text-[11px]">₦{booking.totalAmount.toLocaleString('en-NG')} Total</span>
                      )}
                    </div>
                    {booking.notes && (
                      <p className="text-[10px] text-slate-400 italic font-normal">&quot;{booking.notes}&quot;</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 border-t border-slate-50 md:border-0 pt-2.5 md:pt-0">
                    {booking.status !== "checked_out" && booking.status !== "cancelled" && (
                      <>
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, "checked_in")}
                            className="px-2.5 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Check In
                          </button>
                        )}
                        {booking.status === "checked_in" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, "checked_out")}
                            className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Check Out
                          </button>
                        )}
                        <button
                          onClick={() => setFolioBookingId(folioBookingId === booking.id ? null : booking.id)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                            folioBookingId === booking.id
                              ? "text-violet-700 bg-violet-100"
                              : "text-violet-600 bg-violet-50 hover:bg-violet-100"
                          }`}
                        >
                          <ShoppingBag className="w-3 h-3 inline mr-1" />
                          Folio
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handlePrintReceipt(booking)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-auto md:ml-0"
                      title="Print Invoice / Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {(booking.paymentStatus === "paid" || !booking.paymentStatus) && (
                      <button
                        onClick={() => handleDownloadPDF(booking)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors md:ml-0"
                        title="Download PDF Receipt"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto md:ml-0"
                      title="Cancel Booking"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>

                  {/* Folio / Incidentals Expandable Section */}
                  <AnimatePresence>
                    {folioBookingId === booking.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100 pt-3 mt-2"
                      >
                        <h4 className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> Incidentals / Extra Charges
                        </h4>

                        {/* Existing incidentals */}
                        {(booking.incidentals && booking.incidentals.length > 0) ? (
                          <div className="space-y-1 mb-3">
                            {booking.incidentals.map((inc) => (
                              <div key={inc.id} className="flex items-center justify-between text-[10px] bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                                <span className="text-slate-600">{inc.description} <span className="text-slate-400">({inc.date})</span></span>
                                <span className="font-bold text-slate-700">₦{inc.amount.toLocaleString('en-NG')}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 mb-3">No incidentals added yet.</p>
                        )}

                        {/* Add new incidental form */}
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Description</label>
                            <input
                              type="text"
                              value={incDescription}
                              onChange={(e) => setIncDescription(e.target.value)}
                              placeholder="Room Service, Laundry..."
                              className="w-full px-2.5 py-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white"
                            />
                          </div>
                          <div className="w-28">
                            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Amount (₦)</label>
                            <input
                              type="number"
                              value={incAmount}
                              onChange={(e) => setIncAmount(e.target.value)}
                              placeholder="5000"
                              className="w-full px-2.5 py-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddIncidental(booking.id)}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
