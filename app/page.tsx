'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Search,
  Bell,
  Crown,
  Globe,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import {
  Guest,
  Room,
  Reservation,
  Preference,
  InteractionLog,
  Task,
  Enquiry,
  initialGuests,
  initialRooms,
  initialReservations,
  initialPreferences,
  initialInteractionLogs,
  initialTasks,
  initialEnquiries,
} from '../lib/mockData';

// Component imports
import DashboardHome from '../components/DashboardHome';
import GuestsList from '../components/GuestsList';
import GuestProfile from '../components/GuestProfile';
import CalendarTimeline from '../components/CalendarTimeline';
import EnquiryPipeline from '../components/EnquiryPipeline';
import CampaignsManager from '../components/CampaignsManager';
import AnalyticsReports from '../components/AnalyticsReports';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guests' | 'calendar' | 'enquiries' | 'campaigns' | 'analytics'>('dashboard');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Relational Tables State with safe SSR-safe lazy initializers
  const [guests, setGuests] = useState<Guest[]>(() => {
    if (typeof window !== 'undefined') {
      const g = localStorage.getItem('innsphere_guests');
      if (g) return JSON.parse(g);
    }
    return initialGuests;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    if (typeof window !== 'undefined') {
      const rm = localStorage.getItem('innsphere_rooms');
      if (rm) return JSON.parse(rm);
    }
    return initialRooms;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    if (typeof window !== 'undefined') {
      const res = localStorage.getItem('innsphere_reservations');
      if (res) return JSON.parse(res);
    }
    return initialReservations;
  });

  const [preferences, setPreferences] = useState<Preference[]>(() => {
    if (typeof window !== 'undefined') {
      const pref = localStorage.getItem('innsphere_preferences');
      if (pref) return JSON.parse(pref);
    }
    return initialPreferences;
  });

  const [interactionLogs, setInteractionLogs] = useState<InteractionLog[]>(() => {
    if (typeof window !== 'undefined') {
      const log = localStorage.getItem('innsphere_interaction_logs');
      if (log) return JSON.parse(log);
    }
    return initialInteractionLogs;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('innsphere_tasks');
      if (t) return JSON.parse(t);
    }
    return initialTasks;
  });

  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    if (typeof window !== 'undefined') {
      const enq = localStorage.getItem('innsphere_enquiries');
      if (enq) return JSON.parse(enq);
    }
    return initialEnquiries;
  });

  // Local Search state for top-bar global queries
  const [globalSearch, setGlobalSearch] = useState('');

  // 1. Initial mounting check - async to satisfy linter rule
  useEffect(() => {
    const handle = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  // 2. Synchronize states with localStorage upon edits
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_guests', JSON.stringify(guests));
    }
  }, [guests, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_rooms', JSON.stringify(rooms));
    }
  }, [rooms, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_reservations', JSON.stringify(reservations));
    }
  }, [reservations, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_preferences', JSON.stringify(preferences));
    }
  }, [preferences, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_interaction_logs', JSON.stringify(interactionLogs));
    }
  }, [interactionLogs, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_tasks', JSON.stringify(tasks));
    }
  }, [tasks, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('innsphere_enquiries', JSON.stringify(enquiries));
    }
  }, [enquiries, mounted]);

  // MUTATION HANDLERS
  // A. Guests mutations
  const handleAddGuest = (newG: Omit<Guest, 'id' | 'totalSpend'>) => {
    const id = `g${guests.length + 1}`;
    const guest: Guest = {
      ...newG,
      id,
      totalSpend: 0,
    };
    setGuests([guest, ...guests]);
  };

  // B. Preference mutations
  const handleAddPreference = (newPref: Omit<Preference, 'id'>) => {
    const id = `p${preferences.length + 1}`;
    const pref: Preference = {
      ...newPref,
      id,
    };
    setPreferences([pref, ...preferences]);
  };

  const handleRemovePreference = (prefId: string) => {
    setPreferences(preferences.filter((p) => p.id !== prefId));
  };

  // C. Interaction log mutations
  const handleAddInteractionLog = (newLog: Omit<InteractionLog, 'id' | 'dateSent' | 'status'>) => {
    const id = `i${interactionLogs.length + 1}`;
    const date = new Date();
    const dateSent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const log: InteractionLog = {
      ...newLog,
      id,
      dateSent,
      status: 'Sent',
    };
    setInteractionLogs([log, ...interactionLogs]);
  };

  // D. Booking reservations mutations
  const handleAddReservation = (newRes: Omit<Reservation, 'id'>) => {
    const id = `res${reservations.length + 1}`;
    const res: Reservation = {
      ...newRes,
      id,
    };
    setReservations([res, ...reservations]);

    // Update guest total LTV spend
    setGuests(
      guests.map((g) => {
        if (g.id === newRes.guestId) {
          return {
            ...g,
            totalSpend: g.totalSpend + newRes.totalPaid,
          };
        }
        return g;
      })
    );

    // Update room status to Occupied
    setRooms(
      rooms.map((r) => {
        if (r.id === newRes.roomId) {
          return {
            ...r,
            status: 'Occupied',
          };
        }
        return r;
      })
    );
  };

  // E. Task mutations
  const handleToggleTask = (taskId: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: t.status === 'Completed' ? 'Pending' : 'Completed',
          };
        }
        return t;
      })
    );
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const id = `t${tasks.length + 1}`;
    const date = new Date();
    const createdAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const t: Task = {
      ...newTask,
      id,
      createdAt,
      status: 'Pending',
    };
    setTasks([t, ...tasks]);
  };

  // F. Enquiry mutations
  const handleAddEnquiry = (newEnq: Omit<Enquiry, 'id' | 'createdAt'>) => {
    const id = `e${enquiries.length + 1}`;
    const date = new Date();
    const createdAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const enq: Enquiry = {
      ...newEnq,
      id,
      createdAt,
    };
    setEnquiries([enq, ...enquiries]);
  };

  const handleUpdateEnquiryStage = (enquiryId: string, newStage: Enquiry['stage']) => {
    setEnquiries(
      enquiries.map((e) => {
        if (e.id === enquiryId) {
          return {
            ...e,
            stage: newStage,
          };
        }
        return e;
      })
    );
  };

  const handleDeleteEnquiry = (enquiryId: string) => {
    setEnquiries(enquiries.filter((e) => e.id !== enquiryId));
  };

  const handleUpdateReservation = (resId: string, updates: Partial<Reservation>) => {
    const oldRes = reservations.find((r) => r.id === resId);
    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === resId) {
          return { ...res, ...updates };
        }
        return res;
      })
    );

    // If the room changes, update old room to Vacant + Dirty and new room to Occupied
    if (updates.roomId && oldRes && oldRes.roomId !== updates.roomId) {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === oldRes.roomId) {
            return { ...r, status: 'Vacant', housekeepingStatus: 'Dirty' };
          }
          if (r.id === updates.roomId) {
            return { ...r, status: 'Occupied', housekeepingStatus: 'Clean' };
          }
          return r;
        })
      );
    }
  };

  const handleUpdateRoomHousekeeping = (roomId: string, status: Room['housekeepingStatus']) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          return { ...r, housekeepingStatus: status, status: status === 'Dirty' ? 'Dirty' : r.status };
        }
        return r;
      })
    );
  };

  const handleUpdateGuest = (guestId: string, updates: Partial<Guest>) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === guestId) {
          return { ...g, ...updates };
        }
        return g;
      })
    );
  };

  // G. Trigger marketing campaign interaction bulk logs
  const handleTriggerCampaignBulk = (campaignLogs: Omit<InteractionLog, 'id' | 'dateSent' | 'status'>[]) => {
    const date = new Date();
    const dateSent = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const newLogs = campaignLogs.map((log, idx) => ({
      ...log,
      id: `i${interactionLogs.length + idx + 1}`,
      dateSent,
      status: 'Delivered' as const,
    }));

    setInteractionLogs([...newLogs, ...interactionLogs]);
  };

  // Router dispatcher based on guest selection
  const routeToGuestProfile = (guestId: string) => {
    setSelectedGuestId(guestId);
    setActiveTab('guests');
    setIsMobileMenuOpen(false);
  };

  // Handle global top search
  const filteredGlobalSearchGuests = globalSearch
    ? guests.filter((g) => {
        const full = `${g.firstName} ${g.lastName}`.toLowerCase();
        return full.includes(globalSearch.toLowerCase()) || g.email.toLowerCase().includes(globalSearch.toLowerCase());
      })
    : [];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800">InnSphere Premium CRM</h1>
          <p className="text-xs text-gray-400 mt-1">Bootstrapping relational hotel context data panels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-800 font-sans flex flex-col md:flex-row relative">
      {/* Sidebar navigation */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-100 flex-col shrink-0 z-20">
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">InnSphere CRM</h1>
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest block">Luxe Hospitality</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedGuestId(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Control Deck
          </button>

          <button
            onClick={() => {
              setActiveTab('guests');
              // keep selected guest if they click
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'guests'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Guests Registry
          </button>

          <button
            onClick={() => {
              setActiveTab('calendar');
              setSelectedGuestId(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Visual Calendar
          </button>

          <button
            onClick={() => {
              setActiveTab('enquiries');
              setSelectedGuestId(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'enquiries'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            Group Leads Pipeline
          </button>

          <button
            onClick={() => {
              setActiveTab('campaigns');
              setSelectedGuestId(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Automations & Campaign
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
              setSelectedGuestId(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            Analytics & NPS
          </button>
        </nav>

        {/* Footer status panel */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/20 text-[10px] text-gray-400 font-sans space-y-1">
          <div>InnSphere Server: <span className="text-emerald-600 font-bold">● Operational</span></div>
          <div>Location: <span className="font-medium text-gray-600">Abuja Headquarters</span></div>
          <div>UTC Time: <span className="font-mono text-gray-500">2026-07-04</span></div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-gray-100 flex items-center justify-between p-4 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-gray-900 leading-none">InnSphere CRM</h1>
            <span className="text-[9px] text-amber-700 font-bold block">Abuja Luxe CRM</span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 border border-gray-100 hover:bg-gray-50 rounded-lg text-gray-600 transition"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 bg-white h-full border-r border-gray-100 flex flex-col p-4 animate-slideInLeft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
                <Crown className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-gray-800 text-sm">InnSphere Menu</span>
            </div>

            <nav className="space-y-1 flex-1">
              {[
                { id: 'dashboard', label: 'Control Deck', icon: LayoutDashboard },
                { id: 'guests', label: 'Guests Registry', icon: Users },
                { id: 'calendar', label: 'Visual Calendar', icon: Calendar },
                { id: 'enquiries', label: 'Group Leads Pipeline', icon: Layers },
                { id: 'campaigns', label: 'Automations & Campaign', icon: Sparkles },
                { id: 'analytics', label: 'Analytics & NPS', icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      if (item.id !== 'guests') setSelectedGuestId(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      activeTab === item.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-950 hover:bg-gray-50/80'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top-bar with global search & meta indicators */}
        <header className="bg-white border-b border-gray-100 p-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-10">
          <div className="relative w-full max-w-xs sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Global guest search..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-gray-800"
            />

            {/* Global Search Results Dropdown */}
            {globalSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-50 animate-fadeIn max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider block">Matching Guests</span>
                {filteredGlobalSearchGuests.length === 0 ? (
                  <div className="text-xs text-gray-400 p-3 italic">No matching patrons found</div>
                ) : (
                  filteredGlobalSearchGuests.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        routeToGuestProfile(g.id);
                        setGlobalSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded-xl font-semibold text-gray-800 block"
                    >
                      {g.firstName} {g.lastName} ({g.location})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4.5">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-amber-50/50 border border-amber-100 px-3 py-1 rounded-full">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>Abuja Headquarters</span>
            </div>

            <button className="p-1.5 border border-gray-100 hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-lg transition relative cursor-pointer" title="System Logs">
              <Bell className="w-4 h-4" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-amber-600 rounded-full" />
            </button>

            {/* User profile identifier block */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 shadow-3xs">
                GM
              </div>
              <span className="text-xs font-bold text-gray-700 hidden sm:inline-block">General Manager</span>
            </div>
          </div>
        </header>

        {/* Dynamic page container */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto pb-12">
          {activeTab === 'dashboard' && (
            <DashboardHome
              guests={guests}
              reservations={reservations}
              rooms={rooms}
              tasks={tasks}
              onSelectGuest={routeToGuestProfile}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onAddInteractionLog={handleAddInteractionLog}
            />
          )}

          {activeTab === 'guests' && (
            selectedGuestId ? (
              <GuestProfile
                guestId={selectedGuestId}
                guests={guests}
                reservations={reservations}
                preferences={preferences}
                interactionLogs={interactionLogs}
                rooms={rooms}
                onBack={() => setSelectedGuestId(null)}
                onAddPreference={handleAddPreference}
                onRemovePreference={handleRemovePreference}
                onAddInteractionLog={handleAddInteractionLog}
                onAddReservation={handleAddReservation}
                onUpdateReservation={handleUpdateReservation}
                onUpdateRoomHousekeeping={handleUpdateRoomHousekeeping}
                onUpdateGuest={handleUpdateGuest}
              />
            ) : (
              <GuestsList
                guests={guests}
                onSelectGuest={routeToGuestProfile}
                onAddGuest={handleAddGuest}
              />
            )
          )}

          {activeTab === 'calendar' && (
            <CalendarTimeline
              rooms={rooms}
              guests={guests}
              reservations={reservations}
              onSelectGuest={routeToGuestProfile}
              onUpdateReservation={handleUpdateReservation}
              onUpdateRoomHousekeeping={handleUpdateRoomHousekeeping}
              onAddReservation={handleAddReservation}
              onAddGuest={handleAddGuest}
            />
          )}

          {activeTab === 'enquiries' && (
            <EnquiryPipeline
              enquiries={enquiries}
              onAddEnquiry={handleAddEnquiry}
              onUpdateEnquiryStage={handleUpdateEnquiryStage}
              onDeleteEnquiry={handleDeleteEnquiry}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsManager
              guests={guests}
              onTriggerCampaign={handleTriggerCampaignBulk}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReports
              guests={guests}
              reservations={reservations}
              enquiries={enquiries}
            />
          )}
        </div>
      </main>
    </div>
  );
}
