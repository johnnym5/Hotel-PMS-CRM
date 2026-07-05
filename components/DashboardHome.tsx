'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Users, Calendar, ClipboardList, CheckCircle2, Circle, AlertCircle, Plus, Sparkles, Send } from 'lucide-react';
import { Guest, Reservation, Room, Task, InteractionLog } from '../lib/mockData';

interface DashboardHomeProps {
  guests: Guest[];
  reservations: Reservation[];
  rooms: Room[];
  tasks: Task[];
  onSelectGuest: (guestId: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onAddInteractionLog: (log: Omit<InteractionLog, 'id' | 'dateSent' | 'status'>) => void;
}

export default function DashboardHome({
  guests,
  reservations,
  rooms,
  tasks,
  onSelectGuest,
  onToggleTask,
  onAddTask,
  onAddInteractionLog,
}: DashboardHomeProps) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    assignedTo: 'Musa (Housekeeping)',
    roomId: 'r104',
    urgency: 'Medium' as Task['urgency'],
  });

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    // Get guest associated with room
    const matchingRes = reservations.find((r) => r.roomId === taskForm.roomId && r.status === 'Checked-in');
    const guestId = matchingRes ? matchingRes.guestId : undefined;

    onAddTask({
      title: taskForm.title,
      assignedTo: taskForm.assignedTo,
      roomId: taskForm.roomId,
      guestId,
      urgency: taskForm.urgency,
    });

    setTaskForm({
      title: '',
      assignedTo: 'Musa (Housekeeping)',
      roomId: rooms[0]?.id || '',
      urgency: 'Medium',
    });
    setIsAddTaskOpen(false);
  };

  // 1. Calculate occupancy percentage
  const occupiedRoomsCount = rooms.filter((r) => r.status === 'Occupied').length;
  const totalRoomsCount = rooms.length || 1;
  const occupancyRate = Math.round((occupiedRoomsCount / totalRoomsCount) * 100);

  // 2. Active Guests currently checked in
  const activeReservations = reservations.filter((r) => r.status === 'Checked-in');
  
  // 3. Arrivals today
  // Let's filter arrivals with check-in matching or pending
  const arrivalsToday = reservations.filter((r) => r.status === 'Pending' || r.checkInDate === '2026-07-04');

  const getUrgencyBadgeColor = (urgency: Task['urgency']) => {
    switch (urgency) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Low':
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleQuickWelcomeMessage = (guest: Guest, roomNum: string) => {
    onAddInteractionLog({
      guestId: guest.id,
      type: 'During-Stay',
      channel: 'WhatsApp',
      content: `Hello ${guest.firstName}, welcome to Room ${roomNum}! We hope your suite is perfectly suited to your preferences. Please let us know if we can offer anything further.`,
    });
    alert(`Simulated during-stay welcome message dispatched to ${guest.firstName} (Room ${roomNum}) via WhatsApp!`);
  };

  return (
    <div className="space-y-6" id="dashboard-home-module">
      {/* Quick Statistics Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active guests card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Active Guests (In-House)</span>
            <span className="text-2xl font-black text-gray-800 mt-1 block">{activeReservations.length} Patrons</span>
            <span className="text-[10px] text-gray-400 mt-1 block">Rooms actively settled & occupied</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Arrivals today */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Arrivals / Stays Today</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{arrivalsToday.length} Expected</span>
            <span className="text-[10px] text-gray-400 mt-1 block">Scheduled arrivals for July 4th</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Room occupancy */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Room Occupancy Rate</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{occupancyRate}% Occ.</span>
            <span className="text-[10px] text-gray-400 mt-1 block">{occupiedRoomsCount} of {totalRoomsCount} rooms occupied</span>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-600">
            <LayoutDashboard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Arrivals & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Upcoming Arrivals */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">In-House & Scheduled Arrivals Today</h3>
              <p className="text-xs text-gray-400 mt-0.5">Quick-action deck for incoming or checked-in guests</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold">
              {reservations.length} total active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-50 bg-gray-50/40">
                  <th className="p-3">Guest Name</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Dates (Span)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservations.map((res) => {
                  const guest = guests.find((g) => g.id === res.guestId);
                  const room = rooms.find((r) => r.id === res.roomId);
                  if (!guest) return null;

                  return (
                    <tr key={res.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-3 font-bold text-gray-800">
                        {guest.firstName} {guest.lastName}
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 font-medium px-1.5 py-0.2 rounded ml-1.5 uppercase">
                          {guest.loyaltyTier}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-700">Room {room ? room.roomNumber : 'N/A'}</span>
                        <span className="text-[10px] text-gray-400 block">{room ? room.roomType : ''}</span>
                      </td>
                      <td className="p-3 font-mono text-gray-500">
                        {res.checkInDate} to {res.checkOutDate}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold border text-[9px] ${
                          res.status === 'Checked-in'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : res.status === 'Checked-out'
                            ? 'bg-gray-50 text-gray-500 border-gray-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => onSelectGuest(guest.id)}
                          className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer transition"
                        >
                          View Profile
                        </button>
                        {res.status === 'Checked-in' && (
                          <button
                            onClick={() => handleQuickWelcomeMessage(guest, room?.roomNumber || '')}
                            className="px-2 py-1 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg cursor-pointer transition"
                            title="Send Welcome WhatsApp"
                          >
                            Send Welcome
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Task management list */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500" />
                Hotel Concierge Tasks
              </h3>
              <button
                onClick={() => setIsAddTaskOpen(!isAddTaskOpen)}
                className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                + Add Task
              </button>
            </div>

            {/* Quick add Task panel */}
            {isAddTaskOpen && (
              <form onSubmit={handleTaskSubmit} className="bg-gray-50 p-3.5 rounded-2xl mb-4 space-y-2.5 animate-fadeIn border border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Task Title / Instruction</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Provide wine to room..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Room</label>
                    <select
                      value={taskForm.roomId}
                      onChange={(e) => setTaskForm({ ...taskForm, roomId: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Urgency</label>
                    <select
                      value={taskForm.urgency}
                      onChange={(e) => setTaskForm({ ...taskForm, urgency: e.target.value as Task['urgency'] })}
                      className="w-full px-2 py-1 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Assign Staff</label>
                  <input
                    type="text"
                    required
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddTaskOpen(false)}
                    className="px-2.5 py-1 text-[10px] border border-gray-200 text-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[10px] bg-amber-600 text-white rounded-lg font-bold"
                  >
                    Assign
                  </button>
                </div>
              </form>
            )}

            {/* Task list rows */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4">No concierge tasks scheduled.</p>
              ) : (
                tasks.map((task) => {
                  const roomObj = rooms.find((r) => r.id === task.roomId);
                  return (
                    <div
                      key={task.id}
                      className={`border border-gray-100 p-3 rounded-2xl flex items-start gap-2.5 transition text-xs ${
                        task.status === 'Completed' ? 'bg-gray-50/50 opacity-60' : 'bg-white'
                      }`}
                    >
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 text-gray-400 hover:text-amber-600 transition cursor-pointer"
                        title={task.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {task.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </button>

                      <div className="flex-1">
                        <span
                          className={`font-semibold text-gray-800 ${
                            task.status === 'Completed' ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          {roomObj && (
                            <span className="font-bold text-gray-600">
                              Room {roomObj.roomNumber}
                            </span>
                          )}
                          <span>Assigned: {task.assignedTo}</span>
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.2 border rounded text-[9px] font-semibold uppercase ${getUrgencyBadgeColor(task.urgency)}`}>
                        {task.urgency}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-gray-50 text-[10px] text-gray-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Concierge tasks feed live to housekeeping and beverage prep departments.
          </div>
        </div>
      </div>
    </div>
  );
}
