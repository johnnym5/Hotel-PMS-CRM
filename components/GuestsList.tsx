"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { Search, Plus, User, Mail, Phone, Calendar, Trash2, Edit, X, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  ownerId: string;
}

interface GuestsListProps {
  onSelectGuest: (guestId: string) => void;
  selectedGuestId: string | null;
}

export default function GuestsList({ onSelectGuest, selectedGuestId }: GuestsListProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const isSandbox = !auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");
  const currentUserId = auth.currentUser?.uid || (typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_id") : null) || "sandbox_user";

  useEffect(() => {
    if (isSandbox) {
      const loadLocalGuests = () => {
        try {
          const raw = localStorage.getItem("innsphere_sandbox_guests");
          const allGuests: Guest[] = raw ? JSON.parse(raw) : [];
          // Filter by ownerId of the active sandbox staff operator
          const userGuests = allGuests.filter(g => g.ownerId === currentUserId);
          setGuests(userGuests.sort((a, b) => a.name.localeCompare(b.name)));
          setLoading(false);
          setError(null);
        } catch (e) {
          console.error("Error loading local guests", e);
          setGuests([]);
          setLoading(false);
        }
      };

      loadLocalGuests();

      const handleStorageChange = () => {
        loadLocalGuests();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("innsphere_local_update", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("innsphere_local_update", handleStorageChange);
      };
    } else {
      if (!auth.currentUser) return;

      const path = "guests";
      const q = query(
        collection(db, path),
        where("ownerId", "==", auth.currentUser.uid),
        orderBy("name", "asc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const guestData: Guest[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            guestData.push({
              id: docSnap.id,
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              notes: data.notes || "",
              ownerId: data.ownerId || "",
            });
          });
          setGuests(guestData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setLoading(false);
          try {
            handleFirestoreError(err, OperationType.LIST, path);
          } catch (wrappedError: any) {
            setError("Failed to load guests: Access Denied. Check Firestore security rules.");
          }
        }
      );

      return () => unsubscribe();
    }
  }, [currentUserId, isSandbox]);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (isSandbox) {
      try {
        const newGuest: Guest = {
          id: "guest_" + Date.now(),
          name: name.trim(),
          email: email.trim() || "",
          phone: phone.trim() || "",
          notes: notes.trim() || "",
          ownerId: currentUserId
        };
        const raw = localStorage.getItem("innsphere_sandbox_guests");
        const allGuests: Guest[] = raw ? JSON.parse(raw) : [];
        allGuests.push(newGuest);
        localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(allGuests));
        
        // Dispatch local event
        window.dispatchEvent(new Event("innsphere_local_update"));
        
        // Reset form
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
        setIsAdding(false);
        setError(null);
      } catch (err) {
        setError("Failed to save guest locally.");
      }
      return;
    }

    if (!auth.currentUser) return;
    const path = "guests";
    try {
      setError(null);
      await addDoc(collection(db, path), {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (wrappedError: any) {
        setError("Permission Denied: Could not create guest. Check security rules and ensure email is verified.");
      }
    }
  };

  const handleDeleteGuest = async (guestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this guest profile? It will not delete associated bookings but will orphan them.")) return;

    if (isSandbox) {
      try {
        const raw = localStorage.getItem("innsphere_sandbox_guests");
        const allGuests: Guest[] = raw ? JSON.parse(raw) : [];
        const filtered = allGuests.filter(g => g.id !== guestId);
        localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(filtered));
        
        // Also delete associated bookings for this guest
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        const allBookings: any[] = rawBookings ? JSON.parse(rawBookings) : [];
        const filteredBookings = allBookings.filter(b => b.guestId !== guestId);
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(filteredBookings));

        // Dispatch local event
        window.dispatchEvent(new Event("innsphere_local_update"));
        
        if (selectedGuestId === guestId) {
          onSelectGuest("");
        }
      } catch (err) {
        setError("Failed to delete guest locally.");
      }
      return;
    }

    const path = `guests/${guestId}`;
    try {
      await deleteDoc(doc(db, "guests", guestId));
      if (selectedGuestId === guestId) {
        onSelectGuest("");
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch (wrappedError: any) {
        setError("Permission Denied: Could not delete guest. You must be the owner of this record.");
      }
    }
  };

  const filteredGuests = guests.filter((guest) =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.phone.includes(searchQuery)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden" id="guests-list-container">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Guest Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{guests.length} profile{guests.length !== 1 && "s"} registered</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
          id="btn-add-guest-toggle"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAdding ? "Cancel" : "Add Guest"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-start gap-2.5 text-xs text-red-600 font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Guest Drawer Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            onSubmit={handleAddGuest}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-100 bg-indigo-50/20 overflow-hidden"
            id="form-add-guest"
          >
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Notes / Preferences</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, high floor, repeat guest"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Profile
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 flex items-center bg-white">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Guest List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading registry...</div>
        ) : filteredGuests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {searchQuery ? "No guests match your search filter." : "No guests registered. Add your first guest above!"}
          </div>
        ) : (
          filteredGuests.map((guest) => {
            const isSelected = selectedGuestId === guest.id;
            return (
              <div
                key={guest.id}
                onClick={() => onSelectGuest(guest.id)}
                className={`p-4 flex items-start justify-between cursor-pointer transition-all ${
                  isSelected ? "bg-indigo-50/50 border-l-4 border-indigo-600" : "hover:bg-slate-50/50"
                }`}
                id={`guest-row-${guest.id}`}
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <h3 className="text-xs font-semibold text-slate-800 truncate">{guest.name}</h3>
                  <div className="flex flex-wrap gap-y-1 gap-x-3 text-[10px] text-slate-500">
                    {guest.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {guest.email}
                      </span>
                    )}
                    {guest.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {guest.phone}
                      </span>
                    )}
                  </div>
                  {guest.notes && (
                    <p className="text-[10px] text-slate-400 truncate italic">&quot;{guest.notes}&quot;</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDeleteGuest(guest.id, e)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    title="Delete Guest"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
