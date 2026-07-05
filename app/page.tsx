"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import GuestsList from "../components/GuestsList";
import GuestProfile from "../components/GuestProfile";
import CalendarTimeline from "../components/CalendarTimeline";
import ClientPortal from "../components/ClientPortal";
import HousekeepingBoard from "../components/HousekeepingBoard";
import AdminSettings from "../components/AdminSettings";
import { 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  CheckCircle2, 
  BedDouble, 
  Users, 
  DollarSign, 
  Calendar, 
  Compass,
  Key,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  User as UserIcon,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STAFF_PASSCODES = ["STAFF123", "INNKEEPER", "STAFF2026", "ADMIN"];

// Seed local storage with mock guests and reservations for a vibrant sandbox demo
const ensureLocalSeedData = (staffUid: string) => {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem("innsphere_sandbox_guests")) {
    const defaultGuests = [
      {
        id: "guest_seed_1",
        name: "John Doe",
        email: "john@doe.com",
        phone: "+1 (555) 0100",
        notes: "Likes high floor rooms, repeat customer.",
        ownerId: staffUid
      },
      {
        id: "guest_seed_2",
        name: "Jane Smith",
        email: "jane@smith.com",
        phone: "+1 (555) 0200",
        notes: "Allergic to feathers, extra towels requested.",
        ownerId: staffUid
      },
      {
        id: "guest_seed_3",
        name: "Marcus Aurelius",
        email: "philosopher@rome.org",
        phone: "+1 (555) 0300",
        notes: "Quiet room requested for writing.",
        ownerId: staffUid
      }
    ];
    localStorage.setItem("innsphere_sandbox_guests", JSON.stringify(defaultGuests));
  }

  if (!localStorage.getItem("innsphere_sandbox_bookings")) {
    const defaultBookings = [
      {
        id: "booking_seed_1",
        guestId: "guest_seed_1",
        guestName: "John Doe",
        roomNumber: "101",
        checkIn: "2026-07-05",
        checkOut: "2026-07-08",
        status: "checked_in",
        totalAmount: 360,
        notes: "VIP check-in",
        ownerId: staffUid
      },
      {
        id: "booking_seed_2",
        guestId: "guest_seed_2",
        guestName: "Jane Smith",
        roomNumber: "202",
        checkIn: "2026-07-06",
        checkOut: "2026-07-11",
        status: "confirmed",
        totalAmount: 825,
        notes: "Late arrival",
        ownerId: staffUid
      },
      {
        id: "booking_seed_3",
        guestId: "guest_seed_3",
        guestName: "Marcus Aurelius",
        roomNumber: "105",
        checkIn: "2026-07-05",
        checkOut: "2026-07-15",
        status: "checked_in",
        totalAmount: 1400,
        notes: "Brings own scrolls",
        ownerId: staffUid
      }
    ];
    localStorage.setItem("innsphere_sandbox_bookings", JSON.stringify(defaultBookings));
  }
};

export default function Home() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<"staff" | "client" | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [checkingRole, setCheckingRole] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authentication Page States
  const [isSignUp, setIsSignUp] = useState(false);
  const [authRole, setAuthRole] = useState<"staff" | "client">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live Metrics (for Staff Dashboard)
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [activeGuestsCount, setActiveGuestsCount] = useState(0);
  const [roomOccupancyRate, setRoomOccupancyRate] = useState(0);
  const [projectedRevenue, setProjectedRevenue] = useState(0);

  // Staff Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"frontdesk" | "housekeeping" | "settings">("frontdesk");

  // Toast Notifications State
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: "success" | "info" }[]>([]);
  const knownBookingIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const addToast = (title: string, message: string, type: "success" | "info" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Auth Observer
  useEffect(() => {
    // Check if we are in local sandbox mode first
    const isSandbox = typeof window !== "undefined" && localStorage.getItem("innsphere_sandbox_mode") === "true";
    const sandboxUid = typeof window !== "undefined" ? localStorage.getItem("innsphere_sandbox_user_id") : null;
    
    if (isSandbox && sandboxUid) {
      const role = sandboxUid.includes("staff") ? "staff" : "client";
      setUser({
        uid: sandboxUid,
        email: `demo_${role}@innsphere.com`,
        displayName: role === "staff" ? "Demo Staff Operator" : "Demo Client Guest",
        emailVerified: true,
        isAnonymous: false,
      } as any);
      setUserRole(role as "staff" | "client");
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setCheckingRole(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setUserRole(userDocSnap.data().role as "staff" | "client");
          } else {
            const defaultRole = "client";
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || "anonymous@innsphere.com",
              role: defaultRole,
              createdAt: serverTimestamp()
            });
            setUserRole(defaultRole);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setUserRole("client"); // Safe fallback
        } finally {
          setCheckingRole(false);
        }
      } else {
        setUserRole(null);
        setCheckingRole(false);
      }
      setAuthLoading(false);
      setSelectedGuestId(null);
    });
    return () => unsubscribe();
  }, []);

  // Compute live dashboard metrics in real-time (Only if staff)
  useEffect(() => {
    if (!user || userRole !== "staff") return;

    const isSandbox = user.uid.startsWith("sandbox_") || localStorage.getItem("innsphere_sandbox_mode") === "true";

    if (isSandbox) {
      const loadLocalMetrics = () => {
        try {
          const raw = localStorage.getItem("innsphere_sandbox_bookings");
          const allBookings: any[] = raw ? JSON.parse(raw) : [];
          
          let bookingsCount = 0;
          let activeGuests = 0;
          let occupiedRooms = new Set<string>();
          let revenueSum = 0;

          const currentOwnerBookings = allBookings.filter((data) => data.ownerId === user.uid);

          if (!isInitialLoadRef.current) {
            currentOwnerBookings.forEach((data) => {
              if (!knownBookingIdsRef.current.has(data.id)) {
                addToast("New Booking Alert", `Guest ${data.guestName} booked room ${data.roomNumber || "TBD"}`, "success");
              }
            });
          }

          // Update known booking IDs
          knownBookingIdsRef.current = new Set(currentOwnerBookings.map(b => b.id));

          currentOwnerBookings.forEach((data) => {
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

          isInitialLoadRef.current = false;
        } catch (e) {
          console.error("Error loading local metrics", e);
        }
      };

      loadLocalMetrics();

      const handleStorageChange = () => {
        loadLocalMetrics();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("innsphere_local_update", handleStorageChange);
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("innsphere_local_update", handleStorageChange);
      };
    } else {
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid)
      );

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        let bookingsCount = 0;
        let activeGuests = 0;
        let occupiedRooms = new Set<string>();
        let revenueSum = 0;

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !isInitialLoadRef.current) {
            const data = change.doc.data();
            addToast("New Booking", `Guest ${data.guestName} created a new reservation.`, "success");
          }
        });

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

        isInitialLoadRef.current = false;
      });

      return () => unsubscribe();
    }
  }, [user, userRole]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Ensure Google verified email
      if (!result.user.emailVerified) {
        await signOut(auth);
        setAuthError("Email verification is required. Please use an authenticated Google account.");
        return;
      }

      // Check if user has role in db. If not, write as client by default
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          role: "client",
          createdAt: serverTimestamp()
        });
        setUserRole("client");
      } else {
        setUserRole(userDocSnap.data().role as "staff" | "client");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/network-request-failed") {
        setAuthError("A network request failed. Google Sign-In popups/requests are often blocked by browsers inside sandboxed iframes. Please open the app in a new tab, or click 'Demo Staff' or 'Demo Client' below to instantly enter the fully local Sandbox Mode!");
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError("Google Sign-In is disabled in your Firebase Console. Please enable the Google Sign-In provider in your Firebase project's Authentication settings, or click 'Demo Staff' or 'Demo Client' below to instantly enter the fully local Sandbox Mode!");
      } else {
        setAuthError("Google Sign-In was interrupted or blocked. Please try Email & Password login below, or use the instant Local Sandbox Mode.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Email Registration & Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);

    if (!email || !password) {
      setAuthError("Please provide an email and password.");
      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      setSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        // Validate Staff Secret Code if role is staff
        if (authRole === "staff") {
          const upperCode = staffCode.trim().toUpperCase();
          if (!STAFF_PASSCODES.includes(upperCode)) {
            setAuthError("Invalid Secret Staff Access Code. Hint: Use STAFF123 to register as Staff.");
            setSubmitting(false);
            return;
          }
        }

        // Register new user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update user profile with display name
        if (fullName) {
          await updateProfile(result.user, { displayName: fullName });
        }

        // Save User Role to Database BEFORE triggering Auth observer
        const userDocRef = doc(db, "users", result.user.uid);
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: email,
          role: authRole,
          createdAt: serverTimestamp()
        });

        // If client, auto-create a Guest document with ID = result.user.uid so booking rules pass
        if (authRole === "client") {
          const guestDocRef = doc(db, "guests", result.user.uid);
          await setDoc(guestDocRef, {
            name: fullName || email.split("@")[0],
            email: email,
            phone: "",
            notes: "Self-registered guest",
            ownerId: result.user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        setUserRole(authRole);
      } else {
        // Log In existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("This email address is already registered. Try logging in instead.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setAuthError("Incorrect email or password. Please verify your credentials.");
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError("Email & Password Sign-In is disabled in your Firebase console. Please use Google Sign-In, or click 'Demo Staff' or 'Demo Client' below to instantly enter Local Sandbox Mode.");
      } else if (err.code === "auth/network-request-failed") {
        setAuthError("A network request failed. Connection attempts to Firebase are often blocked by browsers inside sandboxed preview iframes. Please try opening the app in a new tab, or click 'Demo Staff' or 'Demo Client' below to instantly enter the fully local Sandbox Mode!");
      } else {
        setAuthError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Instant Demo Bypass Login (Configures a fully active Client-Side Sandbox Mode)
  const handleDemoBypass = async (role: "staff" | "client") => {
    setAuthError(null);
    setSubmitting(true);
    try {
      const sandboxUid = role === "staff" ? "sandbox_staff_id" : "sandbox_client_id";
      
      // Save Sandbox Mode configuration
      localStorage.setItem("innsphere_sandbox_mode", "true");
      localStorage.setItem("innsphere_sandbox_user_id", sandboxUid);

      // Seed local storage with default demo data if first load
      ensureLocalSeedData(sandboxUid);

      // Set user structure that mocks FirebaseUser
      setUser({
        uid: sandboxUid,
        email: `demo_${role}@innsphere.com`,
        displayName: role === "staff" ? "Demo Staff Operator" : "Demo Client Guest",
        emailVerified: true,
        isAnonymous: false,
      } as any);

      setUserRole(role);
    } catch (err: any) {
      console.error(err);
      setAuthError(`Demo bypass failed: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("innsphere_sandbox_mode");
    localStorage.removeItem("innsphere_sandbox_user_id");
    signOut(auth);
    setUser(null);
    setUserRole(null);
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" id="auth-loading-screen">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuring Session & Role...</p>
        </div>
      </div>
    );
  }

  // --- UNAUTHENTICATED LOGIN / SIGN UP FLOW ---
  if (!user || !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" id="login-screen">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6 relative overflow-hidden"
        >
          {/* Top Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Innsphere</h1>
            <p className="text-xs text-slate-400 font-medium">Boutique Getaway, Reservation, & Cockpit Dashboard</p>
          </div>

          {authError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-3 text-xs text-red-600 font-medium">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{authError}</span>
              </div>
              {authError.includes("Sandbox Mode") && (
                <div className="mt-1 pt-2 border-t border-red-200/50 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleDemoBypass("staff")}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wide transition-all text-center"
                  >
                    Enter Demo Staff Mode
                  </button>
                  <button
                    onClick={() => handleDemoBypass("client")}
                    className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-[10px] uppercase tracking-wide transition-all text-center"
                  >
                    Enter Demo Client Mode
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Toggle between Sign In / Sign Up */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setIsSignUp(false); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isSignUp ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isSignUp ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {/* If Sign Up, let them choose role and type name */}
            {isSignUp && (
              <div className="space-y-4 border-b border-slate-100 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Role Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAuthRole("client")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        authRole === "client" 
                          ? "border-indigo-500 bg-indigo-50/50 text-indigo-600" 
                          : "border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      Client Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthRole("staff")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        authRole === "staff" 
                          ? "border-indigo-500 bg-indigo-50/50 text-indigo-600" 
                          : "border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      Staff Operator
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    required={isSignUp}
                  />
                </div>

                {authRole === "staff" && (
                  <div className="space-y-1.5 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Secret Staff Passcode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. STAFF123"
                      value={staffCode}
                      onChange={(e) => setStaffCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 uppercase"
                      required={isSignUp && authRole === "staff"}
                    />
                    <p className="text-[9px] text-indigo-500/80 font-medium mt-1">Operator code is required for database access. Try <strong>STAFF123</strong>.</p>
                  </div>
                )}
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Password</span>
                {!isSignUp && <span className="text-[9px] text-indigo-500 font-semibold cursor-pointer">Forgot?</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white pr-10 text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  {isSignUp ? "Create My Account" : "Sign In to Cockpit"}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Quick Demoplay</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Quick Demo Bypass (Ideal for IFrame sandbox testing) */}
          <div className="grid grid-cols-2 gap-3" id="quick-demoplay-bypass">
            <button
              onClick={() => handleDemoBypass("staff")}
              disabled={submitting}
              className="py-2.5 px-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              Demo Staff
            </button>
            <button
              onClick={() => handleDemoBypass("client")}
              disabled={submitting}
              className="py-2.5 px-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Demo Client
            </button>
          </div>

          {/* Google Login as Backup */}
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Sign In with Google Account
          </button>
        </motion.div>
      </div>
    );
  }

  // --- CLIENT GUEST PORTAL PORTAL ---
  if (userRole === "client") {
    return <ClientPortal user={user} onSignOut={handleSignOut} />;
  }

  // --- STAFF COCKPIT DASHBOARD PORTAL ---
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
                <p className="text-[9px] text-indigo-600 font-medium mt-0.5 bg-indigo-50 px-1.5 py-0.5 rounded-full inline-block">Staff Operator</p>
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

        {/* Dashboard Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab("frontdesk")}
            className={`px-4 py-2 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === "frontdesk" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Front Desk
          </button>
          <button
            onClick={() => setActiveTab("housekeeping")}
            className={`px-4 py-2 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === "housekeeping" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Housekeeping
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === "settings" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Admin Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "frontdesk" && (
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
                  animate={{ opacity: 1, y: 0 }}
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
                  animate={{ opacity: 1, y: 0 }}
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
        )}

        {activeTab === "housekeeping" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <HousekeepingBoard />
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <AdminSettings />
          </motion.div>
        )}

      </main>

      {/* Real-time Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="toast-notifications-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white/95 backdrop-blur-md border border-slate-150 shadow-2xl shadow-slate-200/50 rounded-2xl p-4 flex items-start gap-3 pointer-events-auto relative overflow-hidden"
              id={`toast-${toast.id}`}
            >
              {/* Subtle colored accent left bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.type === "success" ? "bg-emerald-500" : "bg-indigo-500"}`} />

              <div className="flex-1 ml-1">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 leading-none">
                    {toast.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    )}
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors leading-none -mt-1 -mr-1"
                    id={`close-toast-${toast.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 font-medium mt-1.5 pr-4 leading-normal">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
