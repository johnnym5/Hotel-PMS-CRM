"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { BedDouble, Plus, Trash2, Edit2, Save, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Room } from "../app/page";

const TIER_OPTIONS = ["Standard", "Deluxe", "Executive", "Suite"];
const STATUS_OPTIONS = ["active", "maintenance", "dirty"];
const COLOR_OPTIONS = [
  { label: "Emerald", value: "bg-emerald-500" },
  { label: "Indigo", value: "bg-indigo-500" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Red", value: "bg-red-500" },
  { label: "Amber", value: "bg-amber-500" },
  { label: "Blue", value: "bg-blue-500" },
  { label: "Rose", value: "bg-rose-500" },
];

export default function RoomManager() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    roomNumber: "",
    tier: "Standard",
    price: 20000,
    status: "active" as "active" | "maintenance" | "dirty",
    colorCode: "bg-emerald-500",
  });

  const isSandbox = typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true";

  useEffect(() => {
    if (isSandbox) {
      const loadRooms = () => {
        const localRooms = JSON.parse(localStorage.getItem("innsphere_sandbox_rooms") || "[]");
        setRooms(localRooms.sort((a: Room, b: Room) => a.roomNumber.localeCompare(b.roomNumber)));
        setLoading(false);
      };
      loadRooms();

      const handleStorage = () => loadRooms();
      window.addEventListener("innsphere_local_update", handleStorage);
      return () => window.removeEventListener("innsphere_local_update", handleStorage);
    } else {
      if (!auth.currentUser) return;
      const q = query(collection(db, "rooms"), where("ownerId", "==", auth.currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Room));
        setRooms(fetchedRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)));
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isSandbox]);

  const dispatchLocalUpdate = () => {
    window.dispatchEvent(new Event("innsphere_local_update"));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber) return;

    if (isSandbox) {
      let localRooms = JSON.parse(localStorage.getItem("innsphere_sandbox_rooms") || "[]");
      if (editingId) {
        localRooms = localRooms.map((r: Room) => r.id === editingId ? { ...formData, id: editingId } : r);
      } else {
        localRooms.push({ ...formData, id: "room_" + Date.now() });
      }
      localStorage.setItem("innsphere_sandbox_rooms", JSON.stringify(localRooms));
      dispatchLocalUpdate();
    } else {
      if (!auth.currentUser) return;
      try {
        if (editingId) {
          await updateDoc(doc(db, "rooms", editingId), { ...formData });
        } else {
          await addDoc(collection(db, "rooms"), { ...formData, ownerId: auth.currentUser.uid });
        }
      } catch (err) {
        console.error(err);
      }
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    if (isSandbox) {
      let localRooms = JSON.parse(localStorage.getItem("innsphere_sandbox_rooms") || "[]");
      localRooms = localRooms.filter((r: Room) => r.id !== id);
      localStorage.setItem("innsphere_sandbox_rooms", JSON.stringify(localRooms));
      dispatchLocalUpdate();
    } else {
      try {
        await deleteDoc(doc(db, "rooms", id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const editRoom = (room: Room) => {
    setEditingId(room.id);
    setFormData({
      roomNumber: room.roomNumber,
      tier: room.tier,
      price: room.price,
      status: room.status,
      colorCode: room.colorCode,
    });
    setAdding(true);
  };

  const resetForm = () => {
    setAdding(false);
    setEditingId(null);
    setFormData({
      roomNumber: "",
      tier: "Standard",
      price: 20000,
      status: "active",
      colorCode: "bg-emerald-500",
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading rooms...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Room Management</h2>
            <p className="text-sm text-slate-500">Configure your property&apos;s rooms, tiers, and pricing.</p>
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        )}
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  {editingId ? <Edit2 className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                  {editingId ? "Edit Room" : "Add New Room"}
                </h3>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Room Number</label>
                      <input
                        type="text"
                        required
                        value={formData.roomNumber}
                        onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 101"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tier</label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {TIER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Price (₦)</label>
                      <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Color</label>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md shadow-sm flex-shrink-0 ${formData.colorCode}`}></div>
                        <select
                          value={formData.colorCode}
                          onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingId ? "Save Changes" : "Create Room"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tier</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price/Night</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No rooms configured. Add one above.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${room.colorCode}`}>
                          <BedDouble className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900">{room.roomNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold">
                        {room.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      ₦{room.price.toLocaleString("en-NG")}
                    </td>
                    <td className="py-3 px-4">
                      {room.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Maintenance
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editRoom(room)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
