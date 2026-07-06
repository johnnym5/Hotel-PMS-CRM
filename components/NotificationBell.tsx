"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: "info" | "payment" | "checkout";
  relatedBookingId?: string;
  status: "unread" | "read";
  actionState: "pending" | "seen" | "canceled";
  createdAt?: any;
}

export default function NotificationBell({ userRole, currentUserId }: { userRole: string | null, currentUserId: string | null }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isSandbox = !auth.currentUser || (typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true");

  useEffect(() => {
    if (!currentUserId || !userRole) return;

    if (isSandbox) {
      const loadLocalNotifications = () => {
        const rawNotifs = localStorage.getItem("innsphere_sandbox_notifications");
        const allNotifs: AppNotification[] = rawNotifs ? JSON.parse(rawNotifs) : [];
        const myNotifs = allNotifs.filter(n => n.recipientId === currentUserId || (userRole === "staff" && n.recipientId === "staff_all"));
        // Sort descending by implicit order (assuming later added is newer)
        setNotifications(myNotifs.reverse());
      };

      loadLocalNotifications();
      window.addEventListener("innsphere_local_update", loadLocalNotifications);
      return () => window.removeEventListener("innsphere_local_update", loadLocalNotifications);
    } else {
      const path = "notifications";
      const q = userRole === "staff" 
        ? query(collection(db, path), where("recipientId", "in", [currentUserId, "staff_all"]))
        : query(collection(db, path), where("recipientId", "==", currentUserId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
        });
        loaded.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setNotifications(loaded);
      });

      return () => unsubscribe();
    }
  }, [currentUserId, userRole, isSandbox]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  const markAsRead = async (notificationId: string) => {
    if (isSandbox) {
      const rawNotifs = localStorage.getItem("innsphere_sandbox_notifications");
      const allNotifs: AppNotification[] = rawNotifs ? JSON.parse(rawNotifs) : [];
      const updated = allNotifs.map(n => n.id === notificationId ? { ...n, status: "read" } : n);
      localStorage.setItem("innsphere_sandbox_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("innsphere_local_update"));
      return;
    }

    try {
      await updateDoc(doc(db, "notifications", notificationId), { status: "read" });
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleAction = async (notificationId: string, actionType: "seen" | "canceled", bookingId?: string, clientGuestId?: string) => {
    if (isSandbox) {
      // Handle sandbox action
      const rawNotifs = localStorage.getItem("innsphere_sandbox_notifications");
      let allNotifs: AppNotification[] = rawNotifs ? JSON.parse(rawNotifs) : [];
      allNotifs = allNotifs.map(n => n.id === notificationId ? { ...n, actionState: actionType, status: "read" } : n);

      if (bookingId) {
        const rawBookings = localStorage.getItem("innsphere_sandbox_bookings");
        let allBookings = rawBookings ? JSON.parse(rawBookings) : [];
        allBookings = allBookings.map((b: any) => {
          if (b.id === bookingId) {
            return { ...b, paymentStatus: actionType === "seen" ? "paid" : "pending" };
          }
          return b;
        });
        localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(allBookings));

        if (clientGuestId) {
          allNotifs.push({
            id: "notif_" + Date.now(),
            recipientId: clientGuestId,
            title: actionType === "seen" ? "Payment Confirmed" : "Payment Cancelled",
            message: actionType === "seen" ? "Your payment has been verified by staff." : "Your payment was marked as cancelled or not received.",
            type: "info",
            status: "unread",
            actionState: "seen"
          });
        }
      }

      localStorage.setItem("innsphere_sandbox_notifications", JSON.stringify(allNotifs));
      window.dispatchEvent(new Event("innsphere_local_update"));
      return;
    }

    try {
      // 1. Update Notification
      await updateDoc(doc(db, "notifications", notificationId), {
        actionState: actionType,
        status: "read"
      });

      // 2. Update Booking
      if (bookingId) {
        await updateDoc(doc(db, "bookings", bookingId), {
          paymentStatus: actionType === "seen" ? "paid" : "pending",
          updatedAt: serverTimestamp()
        });

        // 3. Inform Client
        if (clientGuestId) {
          const newNotifRef = doc(collection(db, "notifications"));
          const { setDoc } = await import("firebase/firestore");
          await setDoc(newNotifRef, {
            recipientId: clientGuestId,
            title: actionType === "seen" ? "Payment Confirmed" : "Payment Cancelled",
            message: actionType === "seen" ? "Your payment has been verified by staff." : "Your payment was marked as cancelled or not received.",
            type: "info",
            status: "unread",
            actionState: "seen",
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (e) {
      console.error("Failed to process payment action", e);
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white border border-slate-150 shadow-xl rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-xl transition-colors ${notif.status === 'unread' ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    onClick={() => { if(notif.status === 'unread') markAsRead(notif.id); }}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg h-fit ${notif.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {notif.type === 'payment' ? <CreditCard className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className={`text-xs font-bold ${notif.status === 'unread' ? 'text-slate-800' : 'text-slate-600'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {notif.message}
                        </p>
                        
                        {notif.type === 'payment' && notif.actionState === 'pending' && userRole === "staff" && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(notif.id, "seen", notif.relatedBookingId, notif.message.split('|||')[1]); }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Payment Seen
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(notif.id, "canceled", notif.relatedBookingId, notif.message.split('|||')[1]); }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        )}
                        
                        {notif.type === 'payment' && notif.actionState !== 'pending' && userRole === "staff" && (
                          <div className="mt-2 text-[10px] font-bold text-slate-400 italic">
                            Action taken: {notif.actionState}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
