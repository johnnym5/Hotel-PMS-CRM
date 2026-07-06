"use client";

import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { MessageSquare, Send, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  authorName: string;
  message: string;
  timestamp: string;
}

export default function ShiftLogbook() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSandbox = typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true";
  const currentUserName = auth.currentUser?.displayName || (typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_name") : null) || "Staff Member";

  useEffect(() => {
    if (isSandbox) {
      const loadLocal = () => {
        const raw = localStorage.getItem("innsphere_sandbox_logbook");
        const parsed: LogEntry[] = raw ? JSON.parse(raw) : [];
        setEntries(parsed.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      };
      loadLocal();

      const handler = () => loadLocal();
      window.addEventListener("innsphere_local_update", handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener("innsphere_local_update", handler);
        window.removeEventListener("storage", handler);
      };
    } else {
      if (!auth.currentUser) return;
      const q = query(collection(db, "logbook"), orderBy("timestamp", "desc"), limit(50));
      const unsub = onSnapshot(q, (snapshot) => {
        const loaded: LogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            authorName: data.authorName || "Unknown",
            message: data.message || "",
            timestamp: data.timestamp?.toDate?.()
              ? data.timestamp.toDate().toISOString()
              : new Date().toISOString(),
          });
        });
        setEntries(loaded);
      });
      return () => unsub();
    }
  }, [isSandbox]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSubmitting(true);

    const entry: LogEntry = {
      id: "log_" + Date.now(),
      authorName: currentUserName,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    if (isSandbox) {
      const raw = localStorage.getItem("innsphere_sandbox_logbook");
      const all: LogEntry[] = raw ? JSON.parse(raw) : [];
      all.push(entry);
      localStorage.setItem("innsphere_sandbox_logbook", JSON.stringify(all));
      window.dispatchEvent(new Event("innsphere_local_update"));
    } else {
      try {
        await addDoc(collection(db, "logbook"), {
          authorName: currentUserName,
          message: newMessage.trim(),
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to post logbook entry", err);
      }
    }

    setNewMessage("");
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="p-2 bg-violet-100 text-violet-700 rounded-xl">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Shift Logbook</h3>
          <p className="text-[10px] text-slate-400">Handover notes &amp; shift updates</p>
        </div>
      </div>

      {/* New Note Input */}
      <form onSubmit={handleSubmit} className="p-3 border-b border-slate-100 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type a shift note... (e.g. Room 202 needs extra towels tomorrow)"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={submitting || !newMessage.trim()}
          className="p-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white rounded-xl transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Entries Feed */}
      <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-50">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            No shift notes yet. Be the first to post!
          </div>
        ) : (
          <AnimatePresence>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {entry.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{entry.authorName}</span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(entry.timestamp), "MMM dd, h:mm a")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{entry.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
