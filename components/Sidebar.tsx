"use client";

import React, { useState } from "react";
import { 
  LogOut, 
  LayoutDashboard,
  Users,
  Calendar,
  ShoppingCart,
  BookOpen,
  User as UserIcon,
  Settings,
  BarChart3,
  Lock,
  Compass,
  BedDouble,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  role: "staff" | "client" | "admin" | null;
  userName: string;
  activeView: string;
  setActiveView: (view: string) => void;
  onSignOut: () => void;
}

const MENU_CONFIG = {
  staff: [
    { id: "cockpit", label: "Cockpit Dashboard", icon: LayoutDashboard },
    { id: "registry", label: "Guest Registry", icon: Users },
    { id: "timeline", label: "Room Timeline", icon: Calendar },
    { id: "housekeeping", label: "Housekeeping", icon: Sparkles },
    { id: "analytics", label: "Analytics & Reports", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ],
  client: [
    { id: "book", label: "Reserve Room", icon: ShoppingCart },
    { id: "bookings", label: "My Bookings", icon: BookOpen },
    { id: "profile", label: "Preferences", icon: UserIcon },
    { id: "settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { id: "admin_dashboard", label: "Admin Center", icon: BarChart3 },
    { id: "staff_management", label: "Manage Staff", icon: Lock },
    { id: "rooms_management", label: "Manage Rooms", icon: BedDouble },
    { id: "analytics", label: "Analytics & Reports", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ],
};

export default function Sidebar({ role, userName, activeView, setActiveView, onSignOut }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!role) return null;

  const menuItems = MENU_CONFIG[role] || [];

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isHovered ? 256 : 88 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-slate-900 text-white flex flex-col shadow-2xl h-screen sticky top-0 overflow-x-hidden overflow-y-auto shrink-0 z-50"
    >
      {/* Logo Section */}
      <div className={`p-6 border-b border-slate-800 flex items-center ${isHovered ? "px-6" : "justify-center"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div className={`whitespace-nowrap transition-all duration-300 ${isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>
            <h1 className="text-sm font-bold tracking-tight">Innsphere</h1>
            <p className="text-[10px] text-slate-400 font-medium">{role === "admin" ? "Admin" : role === "staff" ? "Staff" : "Guest"}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              } ${isHovered ? "px-4 justify-start" : "justify-center px-0"}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={`text-left whitespace-nowrap transition-all duration-300 ${isHovered ? "opacity-100 flex-1" : "opacity-0 w-0 overflow-hidden"}`}>
                {item.label}
              </span>
              {isActive && isHovered && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="w-1.5 h-1.5 rounded-full bg-white shrink-0"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className={`flex items-center gap-3 ${isHovered ? "px-2" : "justify-center px-0"}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={`whitespace-nowrap transition-all duration-300 ${isHovered ? "opacity-100 flex-1" : "opacity-0 w-0 overflow-hidden"}`}>
            <p className="text-sm font-semibold text-white truncate max-w-[140px]">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{role} Account</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded-lg text-xs font-semibold transition-all border border-slate-700 hover:border-red-600/30 ${isHovered ? "px-4" : "px-0"}`}
          title={!isHovered ? "Sign Out" : ""}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className={`whitespace-nowrap transition-all duration-300 ${isHovered ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}>
            Sign Out
          </span>
        </button>
      </div>
    </motion.aside>
  );
}
