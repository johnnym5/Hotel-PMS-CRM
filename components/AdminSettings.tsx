"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Settings, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminSettings() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newRoomNum, setNewRoomNum] = useState("");
  const [newRoomRate, setNewRoomRate] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    if (isSandbox) {
      setRooms([
        { id: "r1", roomNumber: "101", rate: 120 },
        { id: "r2", roomNumber: "102", rate: 150 },
        { id: "r3", roomNumber: "201", rate: 200 }
      ]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "rooms"), where("ownerId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNum || !newRoomRate || !auth.currentUser) return;

    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    if (isSandbox) {
      setRooms([...rooms, { id: Math.random().toString(), roomNumber: newRoomNum, rate: Number(newRoomRate) }]);
      setNewRoomNum("");
      setNewRoomRate("");
      setAdding(false);
      return;
    }

    try {
      await addDoc(collection(db, "rooms"), {
        roomNumber: newRoomNum,
        rate: Number(newRoomRate),
        status: "clean",
        ownerId: auth.currentUser.uid
      });
      setNewRoomNum("");
      setNewRoomRate("");
      setAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    const isSandbox = localStorage.getItem("innsphere_sandbox_mode") === "true";
    if (isSandbox) {
      setRooms(rooms.filter(r => r.id !== id));
      return;
    }
    await deleteDoc(doc(db, "rooms", id));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading settings...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          Admin Settings & Rooms
        </h2>
        <button
          onClick={() => setAdding(!adding)}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors"
        >
          {adding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {adding ? "Cancel" : "Add Room"}
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
            onSubmit={handleAddRoom}
          >
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Room Name/Number</label>
                <input
                  type="text"
                  value={newRoomNum}
                  onChange={(e) => setNewRoomNum(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 101 or Suite A"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nightly Rate (₦)</label>
                <input
                  type="number"
                  value={newRoomRate}
                  onChange={(e) => setNewRoomRate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 150"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition-colors"
              >
                Save Room
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Room</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nightly Rate</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-slate-500">No rooms configured. Add one above.</td>
              </tr>
            ) : (
              rooms.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">{r.roomNumber}</td>
                  <td className="py-3 px-4 font-medium text-slate-600">${r.rate}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
