'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  User, 
  Key, 
  Info, 
  Plus, 
  Sparkles, 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  UserPlus,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Room, Guest, Reservation, InteractionLog } from '../lib/mockData';

interface CalendarTimelineProps {
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  onSelectGuest: (guestId: string) => void;
  onUpdateReservation: (resId: string, updates: Partial<Reservation>) => void;
  onUpdateRoomHousekeeping: (roomId: string, status: Room['housekeepingStatus']) => void;
  onAddReservation: (res: Omit<Reservation, 'id'>) => void;
  onAddGuest: (guest: Omit<Guest, 'id' | 'totalSpend'>) => void;
}

export default function CalendarTimeline({
  rooms,
  guests,
  reservations,
  onSelectGuest,
  onUpdateReservation,
  onUpdateRoomHousekeeping,
  onAddReservation,
  onAddGuest,
}: CalendarTimelineProps) {
  // Config: Toggle between 14-day and 30-day PMS timeline
  const [timelineDaysCount, setTimelineDaysCount] = useState<14 | 30>(30);
  const [startDateStr, setStartDateStr] = useState('2026-07-01');

  // Modals
  const [isCheckInDeskOpen, setIsCheckInDeskOpen] = useState(false);
  const [selectedArrivalRes, setSelectedArrivalRes] = useState<Reservation | null>(null);
  const [isHousekeepingManagerOpen, setIsHousekeepingManagerOpen] = useState(false);

  // Walk-In / Check-In form states
  const [checkInStep, setCheckInStep] = useState<1 | 2 | 3>(1);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [walkInGuestForm, setWalkInGuestForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: 'Abuja',
    loyaltyTier: 'Standard' as Guest['loyaltyTier']
  });

  const [checkInBookingForm, setCheckInBookingForm] = useState({
    roomId: rooms[0]?.id || '',
    durationNights: 3,
    bookingSource: 'Walk-in' as Reservation['bookingSource'],
    pricePerNight: 80000,
  });

  // Gov ID Scanning simulation states
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idScanUrl, setIdScanUrl] = useState<string>('');
  const [isIdScanning, setIsIdScanning] = useState(false);
  const [idScanCompleted, setIdScanCompleted] = useState(false);

  // Canvas drawing for digital signature
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Generate date columns starting from startDateStr
  const getDaysArray = (start: string, count: number) => {
    const days = [];
    const date = new Date(start);
    for (let i = 0; i < count; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayOfWeek,
        isToday: dateStr === '2026-07-04',
      });
    }
    return days;
  };

  const days = getDaysArray(startDateStr, timelineDaysCount);

  // Handle timeline shifts
  const handlePrevRange = () => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() - (timelineDaysCount === 14 ? 7 : 15));
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setStartDateStr(`${d.getFullYear()}-${month}-${day}`);
  };

  const handleNextRange = () => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + (timelineDaysCount === 14 ? 7 : 15));
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setStartDateStr(`${d.getFullYear()}-${month}-${day}`);
  };

  const handleResetToToday = () => {
    setStartDateStr('2026-07-01');
  };

  // Helper to check if a reservation overlaps a date
  const getReservationForRoomAndDate = (roomId: string, dateStr: string) => {
    return reservations.find((res) => {
      if (res.roomId !== roomId || res.status === 'Cancelled') return false;
      const checkIn = new Date(res.checkInDate);
      const checkOut = new Date(res.checkOutDate);
      const current = new Date(dateStr);
      checkIn.setHours(0,0,0,0);
      checkOut.setHours(0,0,0,0);
      current.setHours(0,0,0,0);
      return current >= checkIn && current < checkOut;
    });
  };

  // Drag & Drop handlers for reservations on the timeline
  const handleDragStart = (e: React.DragEvent, resId: string) => {
    e.dataTransfer.setData('text/plain', resId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRoomId: string, targetDateStr: string) => {
    e.preventDefault();
    const resId = e.dataTransfer.getData('text/plain');
    if (!resId) return;

    const res = reservations.find((r) => r.id === resId);
    if (!res) return;

    // Calculate length of old stay
    const checkIn = new Date(res.checkInDate);
    const checkOut = new Date(res.checkOutDate);
    const msDiff = checkOut.getTime() - checkIn.getTime();
    const stayLengthNights = Math.round(msDiff / (1000 * 60 * 60 * 24)) || 1;

    // Calculate new checkout date based on dropped date
    const newCheckIn = new Date(targetDateStr);
    const newCheckOut = new Date(newCheckIn);
    newCheckOut.setDate(newCheckIn.getDate() + stayLengthNights);

    const year = newCheckOut.getFullYear();
    const month = String(newCheckOut.getMonth() + 1).padStart(2, '0');
    const dNum = String(newCheckOut.getDate()).padStart(2, '0');
    const newCheckOutDateStr = `${year}-${month}-${dNum}`;

    // Execute state update
    onUpdateReservation(resId, {
      roomId: targetRoomId,
      checkInDate: targetDateStr,
      checkOutDate: newCheckOutDateStr,
    });
  };

  // Digital signature drawing logic
  useEffect(() => {
    if (checkInStep === 2 && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [checkInStep]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse or touch
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setSignatureSaved(true);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureSaved(false);
  };

  // ID scan upload simulator
  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processIdFile(file);
  };

  const processIdFile = (file: File) => {
    setIdFile(file);
    setIsIdScanning(true);
    // Simulating deep text recognition & security scans of Government ID
    setTimeout(() => {
      setIsIdScanning(false);
      setIdScanCompleted(true);
      setIdScanUrl(URL.createObjectURL(file));
    }, 1800);
  };

  // Drop image on Gov ID scanner
  const handleIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processIdFile(file);
    }
  };

  // Handle Walk-In / Desk Check-In save
  const handleCompleteCheckIn = () => {
    let finalGuestId = selectedGuestId;

    if (isWalkIn) {
      // Register new guest first
      const newGId = `g${guests.length + 1}`;
      onAddGuest({
        firstName: walkInGuestForm.firstName,
        lastName: walkInGuestForm.lastName,
        email: walkInGuestForm.email,
        phone: walkInGuestForm.phone,
        location: walkInGuestForm.location,
        loyaltyTier: walkInGuestForm.loyaltyTier,
        tags: ['Walk-in', 'ID Verified'],
        avatarUrl: `https://picsum.photos/seed/${walkInGuestForm.firstName.toLowerCase()}/150`,
      });
      finalGuestId = newGId;
    }

    if (selectedArrivalRes) {
      // Checked in scheduled arrival
      onUpdateReservation(selectedArrivalRes.id, {
        status: 'Checked-in',
      });
    } else {
      // Checked in fresh Walk-In
      const todayStr = '2026-07-04';
      const checkoutDate = new Date();
      checkoutDate.setDate(checkoutDate.getDate() + checkInBookingForm.durationNights);
      const checkoutStr = `${checkoutDate.getFullYear()}-${String(checkoutDate.getMonth() + 1).padStart(2, '0')}-${String(checkoutDate.getDate()).padStart(2, '0')}`;

      onAddReservation({
        guestId: finalGuestId || 'g1',
        roomId: checkInBookingForm.roomId,
        checkInDate: todayStr,
        checkOutDate: checkoutStr,
        totalPaid: checkInBookingForm.pricePerNight * checkInBookingForm.durationNights,
        bookingSource: checkInBookingForm.bookingSource,
        status: 'Checked-in',
      });
    }

    // Reset modals & forms
    setIsCheckInDeskOpen(false);
    setSelectedArrivalRes(null);
    setCheckInStep(1);
    setIdFile(null);
    setIdScanCompleted(false);
    setSignatureSaved(false);
    setIsWalkIn(false);
  };

  // Launch Scheduled check-in desk
  const launchScheduledCheckIn = (res: Reservation) => {
    setSelectedArrivalRes(res);
    setSelectedGuestId(res.guestId);
    setIsWalkIn(false);
    setCheckInBookingForm({
      roomId: res.roomId,
      durationNights: 3, // placeholder
      bookingSource: res.bookingSource,
      pricePerNight: 80000,
    });
    setCheckInStep(1);
    setIsCheckInDeskOpen(true);
  };

  // Launch fresh Walk-In desk
  const launchWalkInCheckIn = () => {
    setSelectedArrivalRes(null);
    setIsWalkIn(true);
    setCheckInStep(1);
    setIsCheckInDeskOpen(true);
  };

  const getCleanlinessBadgeColor = (clean: Room['housekeepingStatus']) => {
    switch (clean) {
      case 'Clean':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Dirty':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Inspecting':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Out of Order':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  // Scheduled arrivals count for today (Jul 4, 2026)
  const scheduledArrivalsCount = reservations.filter(
    (r) => r.status === 'Pending' || (r.status === 'Checked-in' && r.checkInDate === '2026-07-04')
  ).length;

  return (
    <div className="space-y-6" id="calendar-timeline-module">
      {/* Top Header controls with quick selectors */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Calendar className="w-5.5 h-5.5 text-amber-600" />
            Visual PMS Timeline Desk
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Drag reservation blocks horizontally to shift dates, or vertically to transfer rooms. Double-click block for Guest 360 profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeline Resolution toggle */}
          <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 p-1 text-xs">
            <button
              onClick={() => setTimelineDaysCount(14)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timelineDaysCount === 14 
                  ? 'bg-white text-gray-900 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              14-Day Range
            </button>
            <button
              onClick={() => setTimelineDaysCount(30)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timelineDaysCount === 30 
                  ? 'bg-white text-gray-900 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              30-Day Grid
            </button>
          </div>

          <button
            onClick={handleResetToToday}
            className="px-3.5 py-2 text-xs font-bold border border-gray-100 hover:bg-gray-50 rounded-xl text-gray-700 transition cursor-pointer flex items-center gap-1.5 bg-white"
          >
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Base Range (Jul 1st)
          </button>

          <div className="flex items-center border border-gray-100 rounded-xl overflow-hidden bg-white">
            <button
              onClick={handlePrevRange}
              className="p-2 hover:bg-gray-50 text-gray-600 transition border-r border-gray-100 cursor-pointer"
              title="Previous Span"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3.5 text-xs font-bold text-gray-700 select-none bg-gray-50/50">
              {new Date(startDateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextRange}
              className="p-2 hover:bg-gray-50 text-gray-600 transition border-l border-gray-100 cursor-pointer"
              title="Next Span"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PMS Calendar Timeline Core Grid */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {/* Dynamic grid container: Left sidebar is 200px sticky, date columns are 110px each */}
          <div 
            className="min-w-max divide-y divide-gray-100"
            style={{ width: `${200 + timelineDaysCount * 110}px` }}
          >
            {/* Header Date Row */}
            <div className="flex bg-gray-50/80 backdrop-blur-xs font-sans">
              {/* Sticky Rooms Header cell */}
              <div className="w-[200px] shrink-0 p-4 font-bold text-xs text-gray-500 uppercase tracking-wider border-r border-gray-100 sticky left-0 bg-gray-50 z-20">
                Rooms & Suite Type
              </div>

              {/* Day cells */}
              <div className="flex-1 flex">
                {days.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`w-[110px] shrink-0 p-3.5 border-r border-gray-100 flex flex-col items-center justify-center relative ${
                      day.isToday ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                      {day.dayOfWeek}
                    </span>
                    <span
                      className={`text-xs font-bold mt-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        day.isToday
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-gray-700'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                    {day.isToday && (
                      <span className="absolute bottom-0.5 text-[8px] font-extrabold text-amber-700 uppercase tracking-wider animate-pulse">
                        LIVE NOW
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Timeline Rows */}
            <div className="divide-y divide-gray-100 bg-white">
              {rooms.map((room) => (
                <div key={room.id} className="flex group hover:bg-gray-50/30 transition">
                  {/* Sticky left room description cell */}
                  <div className="w-[200px] shrink-0 p-4 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50 transition z-10 flex flex-col justify-center shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-gray-800">
                        Room {room.roomNumber}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-2 py-0.5 border rounded-md uppercase ${getCleanlinessBadgeColor(room.housekeepingStatus || 'Clean')}`}
                        title={`Housekeeping: ${room.housekeepingStatus || 'Clean'}`}
                      >
                        {room.housekeepingStatus || 'Clean'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block truncate font-medium">
                      {room.roomType}
                    </span>
                  </div>

                  {/* Date Grid Slots */}
                  <div className="flex-1 flex">
                    {days.map((day) => {
                      const res = getReservationForRoomAndDate(room.id, day.dateStr);
                      const guest = res ? guests.find((g) => g.id === res.guestId) : null;

                      const isCheckInDay = res && res.checkInDate === day.dateStr;

                      // Visual representations
                      let cellContent = null;
                      if (res && guest) {
                        // Render full reservation blocks spanning multiple days
                        // To make timeline rendering clean, we display the guest pill on the check-in day,
                        // and simple ambient continuation spans on standard days.
                        const colorClasses = 
                          guest.loyaltyTier === 'VIP' 
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100' 
                            : guest.loyaltyTier === 'Platinum'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-100'
                            : guest.loyaltyTier === 'Gold'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100'
                            : guest.loyaltyTier === 'Silver'
                            ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-md shadow-slate-100'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100';

                        if (isCheckInDay) {
                          cellContent = (
                            <div
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, res.id)}
                              onDoubleClick={() => onSelectGuest(guest.id)}
                              className={`w-[210px] h-11 px-3 py-1.5 rounded-xl text-[10px] leading-snug font-semibold text-left select-none cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all absolute left-1 top-1.5 z-10 flex flex-col justify-between ${colorClasses}`}
                              title={`Draggable | ${guest.firstName} ${guest.lastName} (${guest.loyaltyTier})\nStay: ${res.checkInDate} to ${res.checkOutDate}`}
                            >
                              <span className="font-bold block truncate">
                                {res.status === 'Checked-in' ? '🛎️' : '⏳'} {guest.firstName} {guest.lastName}
                              </span>
                              <div className="flex items-center justify-between opacity-80 text-[8px] font-mono">
                                <span>{res.bookingSource}</span>
                                <span>RM {room.roomNumber}</span>
                              </div>
                            </div>
                          );
                        } else {
                          // Render subtle spacer indicator to represent a busy timeline block
                          cellContent = (
                            <div className="w-full h-1.5 bg-gray-200/50 rounded-full opacity-60 mx-1.5" />
                          );
                        }
                      }

                      return (
                        <div
                          key={day.dateStr}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, room.id, day.dateStr)}
                          className={`w-[110px] shrink-0 border-r border-gray-100 flex items-center justify-center min-h-14 relative ${
                            day.isToday ? 'bg-amber-500/5' : 'bg-white'
                          }`}
                        >
                          {cellContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend block */}
        <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Patron Tier Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> VIP
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" /> Platinum
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Gold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" /> Silver
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Standard
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-700">
            <Info className="w-4 h-4" />
            <span>Double-click any booking card to inspect CRM profile</span>
          </div>
        </div>
      </div>

      {/* Quick Action Panel (Layout A Footer) */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 border border-amber-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="font-bold text-amber-950 text-sm uppercase tracking-wider">
            Front Desk PMS Quick Action Panel
          </h3>
          <p className="text-xs text-amber-800">
            Rapid walk-in check-in desk, digital compliance scans, and housekeeper cleanliness dispatch overrides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={launchWalkInCheckIn}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            Check-In Walk-In
          </button>

          <button
            onClick={() => setIsHousekeepingManagerOpen(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            Housekeeping Dispatch ({rooms.filter(r => r.housekeepingStatus === 'Dirty').length} Dirty)
          </button>
        </div>
      </div>

      {/* MODAL 1: CHECK-IN DESK & WALK-IN COMPLIANCE ENGAGEMENT ENGINE */}
      {isCheckInDeskOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-2xl w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" />
                  Live Operational Check-In Desk
                </h3>
                <p className="text-xs text-gray-400 mt-1">Unified hospitality workflow matching PMS check-in with CRM loyalty enrollment.</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold bg-amber-600/10 text-amber-800 px-3 py-1 rounded-full border border-amber-100">
                Step {checkInStep} of 3
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Step 1: Verify Identity / Details */}
              {checkInStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">1. Guest & Booking Configuration</span>
                    <button
                      onClick={() => setIsWalkIn(!isWalkIn)}
                      className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      {isWalkIn ? '← Check-In Existing Booking' : '+ Walk-In Guest Check-In'}
                    </button>
                  </div>

                  {isWalkIn ? (
                    <div className="space-y-4">
                      {/* Walk-In registration Form */}
                      <div className="bg-amber-50/20 border border-amber-100 p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                          <span className="font-bold text-amber-900 text-xs block mb-1">Create Walk-In Guest Profile (CRM Registration)</span>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">First Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Kola"
                            value={walkInGuestForm.firstName}
                            onChange={(e) => setWalkInGuestForm({...walkInGuestForm, firstName: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Last Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Alao"
                            value={walkInGuestForm.lastName}
                            onChange={(e) => setWalkInGuestForm({...walkInGuestForm, lastName: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Email *</label>
                          <input
                            type="email"
                            required
                            placeholder="kola@email.com"
                            value={walkInGuestForm.email}
                            onChange={(e) => setWalkInGuestForm({...walkInGuestForm, email: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Phone *</label>
                          <input
                            type="tel"
                            required
                            placeholder="+234..."
                            value={walkInGuestForm.phone}
                            onChange={(e) => setWalkInGuestForm({...walkInGuestForm, phone: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Loyalty Enrollment Tier</label>
                          <select
                            value={walkInGuestForm.loyaltyTier}
                            onChange={(e) => setWalkInGuestForm({...walkInGuestForm, loyaltyTier: e.target.value as any})}
                            className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-semibold"
                          >
                            <option value="Standard">Standard (No history)</option>
                            <option value="Silver">Silver Tier (New Partner)</option>
                            <option value="Gold">Gold Tier (High Value)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Stay Duration (Nights)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={checkInBookingForm.durationNights}
                            onChange={(e) => setCheckInBookingForm({...checkInBookingForm, durationNights: Number(e.target.value)})}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-gray-500 mb-1">Assign Suite *</label>
                          <select
                            value={checkInBookingForm.roomId}
                            onChange={(e) => setCheckInBookingForm({...checkInBookingForm, roomId: e.target.value})}
                            className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-semibold"
                          >
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.roomNumber} ({r.roomType}) - Housekeeping: {r.housekeepingStatus}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Selected pre-existing reservation card */}
                        {selectedArrivalRes ? (
                          <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-emerald-950 block text-sm">
                                {guests.find(g => g.id === selectedArrivalRes.guestId)?.firstName} {guests.find(g => g.id === selectedArrivalRes.guestId)?.lastName}
                              </span>
                              <span className="text-gray-400 mt-1 block">
                                Stay: {selectedArrivalRes.checkInDate} to {selectedArrivalRes.checkOutDate} • Room {rooms.find(r => r.id === selectedArrivalRes.roomId)?.roomNumber}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold">
                              Scheduled Arrival Selected
                            </span>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Guest to check in:</label>
                            <select
                              value={selectedGuestId}
                              onChange={(e) => setSelectedGuestId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-800 focus:outline-none"
                            >
                              <option value="">-- Choose guest from database --</option>
                              {guests.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.firstName} {g.lastName} ({g.loyaltyTier} Loyalty)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Step 2: Digital ID compliance Scanning Zone */}
              {checkInStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    2. Digital Compliance Compliance Check
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ID Card Scanners */}
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleIdDrop}
                      className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden bg-gray-50 hover:bg-gray-100/50 transition cursor-pointer"
                    >
                      {isIdScanning ? (
                        <div className="space-y-3">
                          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                          <span className="text-xs font-bold text-gray-700 block">Scrutinizing document authenticities...</span>
                          <span className="text-[10px] text-gray-400 block">OCR parsing active</span>
                          {/* Laser scanning visual line */}
                          <div className="absolute left-0 right-0 h-1 bg-amber-500 top-1/2 animate-bounce z-10" />
                        </div>
                      ) : idScanCompleted ? (
                        <div className="space-y-3">
                          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                          <span className="text-xs font-bold text-gray-800 block">Government ID Approved</span>
                          {idScanUrl && (
                            <img src={idScanUrl} alt="Scanned ID thumbnail" className="w-16 h-12 object-cover rounded mx-auto border border-gray-200 shadow-2xs" />
                          )}
                          <span className="text-[10px] text-emerald-700 font-semibold block bg-emerald-50 px-2 py-0.5 rounded-full w-fit mx-auto">Verified Nigeria Driver License</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                          <span className="text-xs font-bold text-gray-800 block">Upload Government ID</span>
                          <span className="text-[10px] text-gray-400 block">Drag & drop passport image or click here</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleIdFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Digital Signature board */}
                    <div className="border border-gray-200 bg-gray-50 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-gray-400" />
                          E-Sign Hotel Registration Card
                        </span>
                        {signatureSaved && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Signed</span>
                        )}
                      </div>

                      {/* Canvas Drawing Board */}
                      <canvas
                        ref={signatureCanvasRef}
                        width={280}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="bg-white border border-gray-200 rounded-xl cursor-crosshair h-[120px]"
                      />

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-gray-400">Draw above with cursor or finger touch</span>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-xs text-gray-500 hover:text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          Clear Signature
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Keycard allocation & Welcome dispatch */}
              {checkInStep === 3 && (
                <div className="space-y-4 animate-fadeIn text-center py-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4 border border-emerald-100">
                    <CheckCircle className="w-8 h-8" />
                  </div>

                  <h4 className="text-base font-bold text-gray-900">Compliance Check complete!</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Government ID scanner validated passport authenticity. Digital signature compiled on reservation registration folio.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-2xl max-w-sm mx-auto space-y-2 text-xs border border-gray-100 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Assigned Suite:</span>
                      <span className="font-bold text-gray-800">
                        Room {rooms.find(r => r.id === (selectedArrivalRes?.roomId || checkInBookingForm.roomId))?.roomNumber} ({rooms.find(r => r.id === (selectedArrivalRes?.roomId || checkInBookingForm.roomId))?.roomType})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Smart Key Allocated:</span>
                      <span className="font-mono font-bold text-amber-700">RF-ID: #7789-X</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">CRM Workflow Trigger:</span>
                      <span className="font-bold text-emerald-600">Simulate check-in welcome WhatsApp dispatch</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-between bg-gray-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsCheckInDeskOpen(false);
                  setCheckInStep(1);
                  setIsWalkIn(false);
                }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
              >
                Close Desk
              </button>

              <div className="flex items-center gap-2">
                {checkInStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCheckInStep((prev) => (prev - 1) as any)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
                  >
                    Back
                  </button>
                )}

                {checkInStep < 3 ? (
                  <button
                    type="button"
                    disabled={checkInStep === 1 && !isWalkIn && !selectedGuestId && !selectedArrivalRes}
                    onClick={() => setCheckInStep((prev) => (prev + 1) as any)}
                    className="px-4.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Continue to Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteCheckIn}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Complete Check-In & Issue Key
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HOUSEKEEPING OVERRIDE MANAGER */}
      {isHousekeepingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="p-6 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Housekeeping Dispatch Center
                </h3>
                <p className="text-xs text-gray-400 mt-1">Mobile-ready staff view to coordinate cleaning slots and inspection tags.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHousekeepingManagerOpen(false)}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Room Attendant Board</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map((room) => (
                  <div key={room.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col justify-between bg-gray-50/30 gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-gray-800 text-sm">Room {room.roomNumber}</span>
                      <span className="text-gray-400 text-[10px]">{room.roomType}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Occupancy:</span>
                      <span className={`font-bold ${room.status === 'Occupied' ? 'text-emerald-600' : 'text-gray-500'}`}>{room.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {['Clean', 'Dirty', 'Inspecting', 'Out of Order'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => onUpdateRoomHousekeeping(room.id, status as any)}
                          className={`px-1.5 py-1 border text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                            room.housekeepingStatus === status
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 text-right bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsHousekeepingManagerOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Finish Dispatch Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
