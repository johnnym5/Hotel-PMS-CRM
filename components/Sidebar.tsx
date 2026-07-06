"use client";

import React from "react";
import { 
  LogOut, 
  LayoutDashboard,
  Users,
  Calendar,
  ShoppingCart,
  BookOpen,
  User as UserIcon,
  Settings,
  LogoIcon,
  BarChart3,
  Lock,
  Compass,
  X
} from "lucide-react";
import { motion } from "motion/react";

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
  ],
  client: [
    { id: "book", label: "Reserve Room", icon: ShoppingCart },
    { id: "bookings", label: "My Bookings", icon: BookOpen },
    { id: "profile", label: "Preferences", icon: UserIcon },
  ],
  admin: [
    { id: "admin_dashboard", label: "Admin Center", icon: BarChart3 },
    { id: "staff_management", label: "Manage Staff", icon: Lock },
    { id: "system_settings", label: "System Settings", icon: Settings },
  ],
};

export default function Sidebar({ role, userName, activeView, setActiveView, onSignOut }: SidebarProps) {
  if (!role) return null;

  const menuItems = MENU_CONFIG[role] || [];

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl h-screen sticky top-0 overflow-y-auto"
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-left flex-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{role} Account</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 rounded-lg text-xs font-semibold transition-all border border-slate-700 hover:border-red-600/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </motion.aside>
  );
}
