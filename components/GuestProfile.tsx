'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  Heart, 
  Calendar, 
  DollarSign, 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  FileText,
  CreditCard,
  Printer,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { Guest, Reservation, Preference, InteractionLog, Room } from '../lib/mockData';

interface GuestProfileProps {
  guestId: string;
  guests: Guest[];
  reservations: Reservation[];
  preferences: Preference[];
  interactionLogs: InteractionLog[];
  rooms: Room[];
  onBack: () => void;
  onAddPreference: (pref: Omit<Preference, 'id'>) => void;
  onRemovePreference: (prefId: string) => void;
  onAddInteractionLog: (log: Omit<InteractionLog, 'id' | 'dateSent' | 'status'>) => void;
  onAddReservation: (res: Omit<Reservation, 'id'>) => void;
  onUpdateReservation: (resId: string, updates: Partial<Reservation>) => void;
  onUpdateRoomHousekeeping: (roomId: string, status: Room['housekeepingStatus']) => void;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
}

export default function GuestProfile({
  guestId,
  guests,
  reservations,
  preferences,
  interactionLogs,
  rooms,
  onBack,
  onAddPreference,
  onRemovePreference,
  onAddInteractionLog,
  onAddReservation,
  onUpdateReservation,
  onUpdateRoomHousekeeping,
  onUpdateGuest,
}: GuestProfileProps) {
  const guest = guests.find((g) => g.id === guestId);

  // Modal / Input states
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isCustomMessageOpen, setIsCustomMessageOpen] = useState(false);
  
  // New preference state
  const [prefCategory, setPrefCategory] = useState<Preference['category']>('Room');
  const [prefDetails, setPrefDetails] = useState('');

  // AI draft states
  const [aiGoal, setAiGoal] = useState('Personalized Preference');
  const [aiChannel, setAiChannel] = useState<'WhatsApp' | 'Email' | 'SMS'>('WhatsApp');
  const [aiCustomContext, setAiCustomContext] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftedSubject, setDraftedSubject] = useState('');
  const [draftedMessage, setDraftedMessage] = useState('');
  const [draftedTone, setDraftedTone] = useState('');
  const [draftedExplanation, setDraftedExplanation] = useState('');

  // Custom booking form state
  const [bookingForm, setBookingForm] = useState({
    roomId: rooms[0]?.id || '',
    checkInDate: '2026-07-10',
    checkOutDate: '2026-07-15',
    totalPaid: 250000,
    bookingSource: 'Direct' as Reservation['bookingSource'],
  });

  // Dynamic checkout folio states
  const [isCheckoutFolioOpen, setIsCheckoutFolioOpen] = useState(false);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [paystackCard, setPaystackCard] = useState({ number: '', expiry: '', cvv: '' });
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paystackSuccess, setPaystackSuccess] = useState(false);
  const [checkoutNpsRating, setCheckoutNpsRating] = useState<number>(5);

  // Split billing states
  const [splitBillingEnabled, setSplitBillingEnabled] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'Corporate' | 'FiftyFifty'>('Corporate');

  // Custom Folio extra charges lists
  const [extraCharges, setExtraCharges] = useState<Array<{ id: string; item: string; amount: number }>>([
    { id: 'f1', item: 'Gourmet Room Service Dinner', amount: 24500 },
    { id: 'f2', item: 'Premium Laundry Service', amount: 12000 },
  ]);
  const [newChargeItem, setNewChargeItem] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState<number>(0);

  if (!guest) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        Guest profile not found or has been deleted.
        <button onClick={onBack} className="block mt-4 mx-auto text-amber-600 font-semibold text-xs hover:underline">
          Back to Registry
        </button>
      </div>
    );
  }

  // Filter items for THIS guest
  const guestReservations = reservations.filter((r) => r.guestId === guest.id);
  const guestPreferences = preferences.filter((p) => p.guestId === guest.id);
  const guestLogs = interactionLogs.filter((l) => l.guestId === guest.id);

  // Find active checked-in reservation for this guest
  const activeStay = guestReservations.find((res) => res.status === 'Checked-in');
  const activeStayRoom = activeStay ? rooms.find((r) => r.id === activeStay.roomId) : null;

  // Calculate stay duration
  const getStayNights = (checkInStr: string, checkOutStr: string) => {
    const inDate = new Date(checkInStr);
    const outDate = new Date(checkOutStr);
    const diff = outDate.getTime() - inDate.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  const getRoomPricePerNight = (type: Room['roomType']) => {
    switch (type) {
      case 'Presidential Suite': return 250000;
      case 'Executive Suite': return 120000;
      case 'Deluxe': return 80000;
      case 'Standard Double': return 50000;
      default: return 60000;
    }
  };

  const stayNights = activeStay ? getStayNights(activeStay.checkInDate, activeStay.checkOutDate) : 0;
  const roomRatePerNight = activeStayRoom ? getRoomPricePerNight(activeStayRoom.roomType) : 0;
  const baseRoomCharge = stayNights * roomRatePerNight;

  const extrasSum = extraCharges.reduce((acc, curr) => acc + curr.amount, 0);
  const subtotal = baseRoomCharge + extrasSum;
  const taxAmount = Math.round(subtotal * 0.125); // 12.5% VAT & consumption taxes
  const totalAmountDue = subtotal + taxAmount;

  // Split-billing calculation
  let guestLiability = totalAmountDue;
  let corporateLiability = 0;

  if (splitBillingEnabled) {
    if (splitMethod === 'Corporate') {
      // 100% of base room charge to Chevron Nigeria, extras/taxes to guest
      corporateLiability = Math.round(baseRoomCharge * 1.125); // room rate + tax share
      guestLiability = Math.round(totalAmountDue - corporateLiability);
    } else {
      // 50 / 50 Split
      guestLiability = Math.round(totalAmountDue / 2);
      corporateLiability = Math.round(totalAmountDue / 2);
    }
  }

  const handleAddPref = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefDetails.trim()) return;
    onAddPreference({
      guestId: guest.id,
      category: prefCategory,
      details: prefDetails.trim(),
    });
    setPrefDetails('');
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    onAddReservation({
      guestId: guest.id,
      roomId: bookingForm.roomId,
      checkInDate: bookingForm.checkInDate,
      checkOutDate: bookingForm.checkOutDate,
      totalPaid: Number(bookingForm.totalPaid),
      bookingSource: bookingForm.bookingSource,
      status: 'Pending',
    });
    setIsNewBookingOpen(false);
  };

  // Folio actions
  const handleAddFolioCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChargeItem.trim() || newChargeAmount <= 0) return;
    setExtraCharges([
      ...extraCharges,
      { id: `fx-${Date.now()}`, item: newChargeItem.trim(), amount: Number(newChargeAmount) }
    ]);
    setNewChargeItem('');
    setNewChargeAmount(0);
  };

  const handleRemoveFolioCharge = (id: string) => {
    setExtraCharges(extraCharges.filter(c => c.id !== id));
  };

  // Paystack Overlay Simulation
  const triggerPaystackGateway = () => {
    setIsPaystackOpen(true);
    setPaystackSuccess(false);
  };

  const handlePaystackPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaystackLoading(true);
    setTimeout(() => {
      setPaystackLoading(false);
      setPaystackSuccess(true);
    }, 2000);
  };

  // Print invoice simulator
  const handlePrintFolio = () => {
    window.print();
  };

  // Complete checkout process and trigger PMS-CRM loop
  const handleCompleteCheckOut = () => {
    if (!activeStay) return;

    // 1. Update reservation status to Checked-out and register payment
    onUpdateReservation(activeStay.id, {
      status: 'Checked-out',
      totalPaid: totalAmountDue,
    });

    // 2. Set suite to vacant and DIRTY so housekeeping can dispatch immediately
    onUpdateRoomHousekeeping(activeStay.roomId, 'Dirty');

    // 3. Register stay NPS Rating & update tags
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Dynamic NPS categorization
    const newTags = [...guest.tags];
    if (checkoutNpsRating === 5 && !newTags.includes('Brand Promoter')) {
      newTags.push('Brand Promoter');
    }

    // Update guest profile values
    onUpdateGuest(guest.id, {
      totalSpend: guest.totalSpend + totalAmountDue,
      tags: newTags,
    });

    // 4. Register Check-out dispatch log
    onAddInteractionLog({
      guestId: guest.id,
      type: 'Post-Stay',
      channel: 'WhatsApp',
      content: `Checkout Settlement Complete.\nFinal Folio settled via Paystack.\nTotal amount: ${formatCurrency(totalAmountDue)}\nNPS Rating: ${checkoutNpsRating}/5\nSuite ${activeStayRoom?.roomNumber} vacated and set to Housekeeping DIRTY.`,
    });

    // 5. CRM AUTOMATION: Trigger 12h WhatsApp post-stay review survey
    setTimeout(() => {
      onAddInteractionLog({
        guestId: guest.id,
        type: 'Post-Stay',
        channel: 'WhatsApp',
        content: `Hi ${guest.firstName},\n\nWe hope you enjoyed your stay in our ${activeStayRoom?.roomType}! We noticed you rated us ${checkoutNpsRating}/5 stars. To say thank you, please use voucher code DIRECT15 for 15% off your next booking with us! See you soon.`,
      });
    }, 800);

    // Reset checkout states
    setIsCheckoutFolioOpen(false);
    setIsPaystackOpen(false);
    setPaystackSuccess(false);
  };

  // Generate Personalized draft using Gemini Route
  const handleGenerateAIDraft = async () => {
    setIsGeneratingDraft(true);
    setDraftedMessage('');
    try {
      const response = await fetch('/api/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: aiGoal,
          channel: aiChannel,
          guestName: `${guest.firstName} ${guest.lastName}`,
          loyaltyTier: guest.loyaltyTier,
          preferences: guestPreferences.map((p) => `${p.category}: ${p.details}`),
          customPrompt: aiCustomContext,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setDraftedMessage(`Error: ${data.error}`);
      } else {
        setDraftedSubject(data.subject || '');
        setDraftedMessage(data.message || '');
        setDraftedTone(data.tone || '');
        setDraftedExplanation(data.explanation || '');
      }
    } catch (err: any) {
      console.error(err);
      setDraftedMessage('Failed to connect to the CRM campaign generator server.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendDraft = () => {
    if (!draftedMessage) return;
    onAddInteractionLog({
      guestId: guest.id,
      type: 'Campaign',
      channel: aiChannel,
      content: draftedSubject ? `Subject: ${draftedSubject}\n\n${draftedMessage}` : draftedMessage,
    });
    setDraftedMessage('');
    setDraftedSubject('');
    setIsCustomMessageOpen(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6" id="guest-profile-container">
      {/* Back button header */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Guests Registry
      </button>

      {/* Prominent Active Check-In Stay banner */}
      {activeStay && activeStayRoom && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full">
              🛎️ Active Check-In Desk Stay
            </span>
            <h3 className="text-lg font-extrabold">
              Currently Staying in Room {activeStayRoom.roomNumber} ({activeStayRoom.roomType})
            </h3>
            <p className="text-xs text-white/80">
              Stay Span: {activeStay.checkInDate} to {activeStay.checkOutDate} ({stayNights} Nights) • Loyalty Level: {guest.loyaltyTier}
            </p>
          </div>

          <button
            onClick={() => setIsCheckoutFolioOpen(true)}
            className="px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-xl transition cursor-pointer shadow-xs"
          >
            Open Single-Screen Check-Out Folio
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Guest Info & Action panel */}
        <div className="space-y-6">
          {/* Guest Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500 shadow-sm relative mb-4">
              {guest.avatarUrl ? (
                <img src={guest.avatarUrl} alt={guest.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                  <User className="w-10 h-10 text-amber-600" />
                </div>
              )}
            </div>

            <span className="px-2.5 py-0.5 bg-red-50 text-red-700 font-bold border border-red-100 rounded-md text-[10px] tracking-wide uppercase">
              {guest.loyaltyTier} Patron
            </span>

            <h2 className="text-xl font-extrabold text-gray-900 mt-2">
              {guest.firstName} {guest.lastName}
            </h2>

            <span className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-center">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Base: {guest.location}
            </span>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 justify-center mt-3.5">
              {guest.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-semibold">
                  {tag}
                </span>
              ))}
            </div>

            {/* Quick Contact Info */}
            <div className="w-full border-t border-gray-50 mt-5 pt-5 space-y-2.5 text-left text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{guest.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{guest.phone}</span>
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wider">
              Staff Action Panel
            </h3>
            <div className="space-y-3.5">
              <button
                onClick={() => setIsCustomMessageOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Send AI Custom Message
              </button>

              <button
                onClick={() => setIsNewBookingOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                Create New Booking
              </button>

              <div className="bg-gray-50 rounded-2xl p-4 mt-2">
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide">
                  Customer Lifetime Valuation
                </span>
                <span className="text-xl font-black text-gray-800 mt-1 block">
                  {formatCurrency(guest.totalSpend)}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Total stay bookings: {guestReservations.length} stays
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right column: Stays, preferences, logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Preferences Module */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Preference Profile Tracking
              </h3>
              <span className="text-xs text-gray-400">Capturing room & dining preferences</span>
            </div>

            {/* List of active preferences */}
            {guestPreferences.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">No specific preference logs registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {guestPreferences.map((pref) => (
                  <div key={pref.id} className="bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-2 group transition">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {pref.category}
                      </span>
                      <p className="text-xs font-medium text-gray-700 mt-1.5 leading-relaxed">
                        {pref.details}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemovePreference(pref.id)}
                      className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Delete preference"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Preference Mini-form */}
            <form onSubmit={handleAddPref} className="border-t border-gray-50 pt-4 flex gap-2">
              <select
                value={prefCategory}
                onChange={(e) => setPrefCategory(e.target.value as Preference['category'])}
                className="text-xs border border-gray-200 rounded-xl px-2.5 py-2 bg-gray-50 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="Room">Room</option>
                <option value="Food & Beverage">Food & Bev</option>
                <option value="Bedding">Bedding</option>
                <option value="Temperature">Temp</option>
                <option value="Service">Service</option>
              </select>

              <input
                type="text"
                required
                placeholder="e.g. Needs decaf tea pods in room, pillow firm"
                value={prefDetails}
                onChange={(e) => setPrefDetails(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
              />

              <button
                type="submit"
                className="bg-gray-100 hover:bg-amber-600 hover:text-white text-gray-700 text-xs px-3.5 py-2 rounded-xl transition font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4 inline mr-0.5" /> Add
              </button>
            </form>
          </div>

          {/* Stay history & revenue */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Stay Dates & Booking History
            </h3>

            {guestReservations.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No bookings found for this customer.</p>
            ) : (
              <div className="space-y-2.5">
                {guestReservations.map((res) => {
                  const roomObj = rooms.find((r) => r.id === res.roomId);
                  return (
                    <div key={res.id} className="border border-gray-100 hover:border-gray-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-gray-50/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">
                            Room {roomObj ? roomObj.roomNumber : 'N/A'} ({roomObj ? roomObj.roomType : 'Standard'})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            res.status === 'Checked-in'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : res.status === 'Checked-out'
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        <div className="text-gray-400 mt-1 font-sans">
                          Stay period: {res.checkInDate} to {res.checkOutDate} • Source: {res.bookingSource}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800 block">
                          {formatCurrency(res.totalPaid)}
                        </span>
                        <span className="text-[10px] text-gray-400">Total bill settled</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CRM interaction logs & Automation Triggers */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              Automated Messaging & Interaction Logs
            </h3>

            {guestLogs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No communication logs recorded yet for this guest.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {guestLogs.map((log) => (
                  <div key={log.id} className="border border-gray-100 p-3.5 rounded-2xl bg-gray-50/50 relative text-xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          {log.type}
                        </span>
                        <span className="text-gray-400">via {log.channel}</span>
                      </div>
                      <span className="text-gray-400">{log.dateSent}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-2 font-mono whitespace-pre-line leading-relaxed border-l-2 border-amber-500/40 pl-2.5">
                      {log.content}
                    </p>
                    <span className="absolute bottom-2.5 right-3 text-[9px] text-emerald-600 font-bold">
                      ✓ {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: SINGLE-SCREEN CHECK-OUT FOLIO & CRM ENGINE (Layout B) */}
      {isCheckoutFolioOpen && activeStay && activeStayRoom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-4xl w-full overflow-hidden shadow-2xl my-8">
            {/* Header */}
            <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5.5 h-5.5 text-emerald-600" />
                  Layout B: Guest Folio & CRM Check-Out Panel
                </h3>
                <p className="text-xs text-gray-500 mt-1">Consolidated checkout desk, split-billing options, and automated CRM retention rules.</p>
              </div>
              <button
                onClick={() => setIsCheckoutFolioOpen(false)}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                Close Folio
              </button>
            </div>

            {/* Split layout: Left is Folio Billing, Right is CRM loop */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left Side: BILLING DETAILS (FOLIO) */}
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wide">1. Billing Details (Folio)</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">Suite {activeStayRoom.roomNumber}</span>
                </div>

                {/* Folio Items */}
                <div className="space-y-3">
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/40 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-gray-800">Room Stay ({stayNights} Nights)</span>
                      <span className="text-gray-400 block mt-0.5">Rate: {formatCurrency(roomRatePerNight)} / Night</span>
                    </div>
                    <span className="font-mono font-bold text-gray-800">{formatCurrency(baseRoomCharge)}</span>
                  </div>

                  {extraCharges.map((c) => (
                    <div key={c.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-center text-xs hover:bg-gray-50 transition">
                      <div>
                        <span className="font-semibold text-gray-700">{c.item}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Extra Charge</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-800">{formatCurrency(c.amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFolioCharge(c.id)}
                          className="text-gray-300 hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add dynamic extra service form */}
                <form onSubmit={handleAddFolioCharge} className="flex gap-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bar Tab, Spa session..."
                    value={newChargeItem}
                    onChange={(e) => setNewChargeItem(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none"
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="N Amount"
                    value={newChargeAmount || ''}
                    onChange={(e) => setNewChargeAmount(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-xs border border-gray-200 bg-white rounded-lg focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700 cursor-pointer"
                  >
                    + Add
                  </button>
                </form>

                {/* Split-Billing Option */}
                <div className="bg-amber-50/20 border border-amber-100 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={splitBillingEnabled}
                        onChange={(e) => setSplitBillingEnabled(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-600 rounded"
                      />
                      Enable Corporate Split-Billing
                    </label>
                  </div>

                  {splitBillingEnabled && (
                    <div className="space-y-3.5 text-xs">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSplitMethod('Corporate')}
                          className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                            splitMethod === 'Corporate' 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : 'bg-white hover:bg-amber-50/50 border-amber-200 text-amber-900'
                          }`}
                        >
                          Bill Suite to Chevron Nigeria
                        </button>
                        <button
                          type="button"
                          onClick={() => setSplitMethod('FiftyFifty')}
                          className={`flex-1 py-1.5 px-3 border rounded-xl font-bold transition-all ${
                            splitMethod === 'FiftyFifty' 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : 'bg-white hover:bg-amber-50/50 border-amber-200 text-amber-900'
                          }`}
                        >
                          Equal 50/50 Split Shares
                        </button>
                      </div>

                      <div className="bg-white border border-amber-100 p-2.5 rounded-xl space-y-1.5 text-[11px] leading-relaxed">
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Chevron Nigeria (Corporate Liability):</span>
                          <span className="font-mono font-bold text-amber-950">{formatCurrency(corporateLiability)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Tunde (Personal Guest Liability):</span>
                          <span className="font-mono font-bold text-amber-950">{formatCurrency(guestLiability)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtotals & Taxes */}
                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT & consumption tax (12.5%):</span>
                    <span className="font-mono font-semibold">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-sm font-black text-gray-800">
                    <span>TOTAL AMOUNT DUE:</span>
                    <span className="font-mono">{formatCurrency(totalAmountDue)}</span>
                  </div>
                </div>

                {/* Payment Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={triggerPaystackGateway}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay with Paystack
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteCheckOut}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    Pay Cash / POS
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintFolio}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-gray-400" />
                    Print Folio Invoice
                  </button>
                </div>
              </div>

              {/* Right Side: CRM PREFERENCES & ENGAGEMENT */}
              <div className="p-6 space-y-6 bg-gray-50/30">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wide">2. CRM Preferences & Engagement</span>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">CRM Loop Sync</span>
                </div>

                {/* Guest CRM Summary */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-100 p-4 rounded-2xl text-xs space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Patron Level:</span>
                      <span className="font-bold text-red-700">{guest.loyaltyTier} Tier</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Captured Preferences:</span>
                      <span className="font-bold text-gray-800 truncate max-w-[150px]">
                        {guestPreferences.length > 0 ? guestPreferences.map(p => p.details).join(', ') : 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Recorded Stays:</span>
                      <span className="font-bold text-gray-800">{guestReservations.length} total visits</span>
                    </div>
                  </div>

                  {/* Operational NPS Rating Selector */}
                  <div className="bg-white border border-gray-100 p-4 rounded-2xl space-y-3 text-xs">
                    <span className="font-bold text-gray-800 block">Assess Stay NPS Experience (1-5 Stars)</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCheckoutNpsRating(star)}
                          className="text-amber-400 hover:scale-110 transition cursor-pointer"
                        >
                          <Star 
                            className="w-6 h-6" 
                            fill={star <= checkoutNpsRating ? '#f59e0b' : 'none'} 
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {checkoutNpsRating === 5 
                        ? 'Promoter Experience: Will auto-tag guest as "Brand Promoter" and schedule birthday promo campaign.'
                        : 'Review trigger: Will schedule manual customer relations follow-up loop.'}
                    </p>
                  </div>

                  {/* Upcoming Automated Events */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-2xl space-y-3.5">
                    <span className="text-xs font-bold text-amber-950 block flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-700" />
                      Upcoming Automated Campaigns
                    </span>

                    <div className="space-y-3 text-[11px] leading-relaxed">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-amber-600/10 rounded-full flex items-center justify-center text-amber-700 font-bold text-[9px] shrink-0 mt-0.5">1</div>
                        <div>
                          <span className="font-bold text-amber-950 block">WhatsApp Checkout Survey</span>
                          <span className="text-amber-800 block mt-0.5">Dispatched in 12 hours. Offers return voucher code <strong>DIRECT15</strong> for direct repeat bookings.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-amber-600/10 rounded-full flex items-center justify-center text-amber-700 font-bold text-[9px] shrink-0 mt-0.5">2</div>
                        <div>
                          <span className="font-bold text-amber-950 block">Loyalty Reward Campaign</span>
                          <span className="text-amber-800 block mt-0.5">Dispatched in 7 days. Personalized email draft targeting {guestPreferences[0]?.details || 'guest preferences'}.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-100 flex items-start gap-2.5 text-[10px] text-gray-400">
                  <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                  Completing checkout sets Suite {activeStayRoom.roomNumber} to HOUSEKEEPING DIRTY, which live-syncs with Room Attendant dashboard.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYSTACK GATEWAY POPUP SIMULATOR */}
      {isPaystackOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-sm w-full overflow-hidden shadow-2xl relative">
            {/* Paystack green Header styling */}
            <div className="p-5 bg-[#09a5db]/5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#3bb75e] flex items-center justify-center text-white font-bold text-sm">P</div>
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Paystack Secure checkout</span>
                  <span className="text-[10px] text-gray-400 block">Merchant: InnSphere OS Limited</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPaystackOpen(false);
                  setPaystackSuccess(false);
                }}
                className="text-xs font-bold text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                Close
              </button>
            </div>

            {paystackSuccess ? (
              <div className="p-6 text-center space-y-4 animate-fadeIn">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100 animate-pulse">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Payment Authorized Successfully!</h4>
                <p className="text-xs text-gray-500">Transaction ID: pstk_7789230198 • Amount paid: {formatCurrency(totalAmountDue)}</p>
                <button
                  type="button"
                  onClick={handleCompleteCheckOut}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Conclude checkout Settlement
                </button>
              </div>
            ) : (
              <form onSubmit={handlePaystackPayment} className="p-6 space-y-4 text-xs">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Folio payment balance</span>
                  <span className="text-xl font-black text-gray-800">{formatCurrency(totalAmountDue)}</span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-gray-500 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tunde Alao"
                      defaultValue={`${guest.firstName} ${guest.lastName}`}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      value={paystackCard.number}
                      onChange={(e) => setPaystackCard({...paystackCard, number: e.target.value})}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-500 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={paystackCard.expiry}
                        onChange={(e) => setPaystackCard({...paystackCard, expiry: e.target.value})}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        placeholder="***"
                        value={paystackCard.cvv}
                        onChange={(e) => setPaystackCard({...paystackCard, cvv: e.target.value})}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paystackLoading}
                  className="w-full py-3 bg-[#3bb75e] hover:bg-[#329a4f] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {paystackLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Contacting Central Bank Gateway...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay {formatCurrency(totalAmountDue)}
                    </>
                  )}
                </button>

                <div className="text-[10px] text-gray-400 text-center flex items-center gap-1 justify-center">
                  <span>🔒 Secured by Paystack and PCIDSS protocols</span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: New Booking Form */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-6 bg-amber-50/50 border-b border-amber-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                Reserve Room Stay
              </h3>
              <p className="text-xs text-gray-500 mt-1">Reserve a suite stay for {guest.firstName} {guest.lastName}.</p>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Available Suite Room</label>
                <select
                  value={bookingForm.roomId}
                  onChange={(e) => setBookingForm({ ...bookingForm, roomId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white text-gray-800 font-semibold"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.roomType}) - {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.checkInDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, checkInDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.checkOutDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, checkOutDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bill Amount Settled (NGN)</label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={bookingForm.totalPaid}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalPaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reservation Source</label>
                  <select
                    value={bookingForm.bookingSource}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingSource: e.target.value as Reservation['bookingSource'] })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none bg-white text-gray-800 font-semibold"
                  >
                    <option value="Direct">Direct</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Expedia">Expedia</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Book Stay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI Custom message template compiler */}
      {isCustomMessageOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-amber-50 to-indigo-50/50 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                InnSphere AI Copilot Copywriter
              </h3>
              <p className="text-xs text-gray-500 mt-1">Generates customized, premium hospitality templates that dynamically weave guest preferences into text copy.</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Goal / Trigger</label>
                  <select
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-800 font-semibold"
                  >
                    <option value="Pre-Arrival">Pre-Arrival preference confirmation</option>
                    <option value="During-Stay">During-stay welcome check-in</option>
                    <option value="Post-Checkout">Post-checkout feedback loop</option>
                    <option value="Loyalty Upgrade">Loyalty upgrade offer</option>
                    <option value="Personalized Preference">Custom preference surprise & delight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target Channel</label>
                  <select
                    value={aiChannel}
                    onChange={(e) => setAiChannel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-800 font-semibold"
                  >
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="SMS">SMS Text</option>
                    <option value="Email">Email Template</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Additional Constraints / Offerings (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Include 10% discount, mention complimentary decaf coffee upgrade, etc."
                  value={aiCustomContext}
                  onChange={(e) => setAiCustomContext(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <button
                type="button"
                disabled={isGeneratingDraft}
                onClick={handleGenerateAIDraft}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                {isGeneratingDraft ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Consulting Gemini copywriter model...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Compile Personalized Template
                  </>
                )}
              </button>

              {/* Live Draft Preview Panel */}
              {draftedMessage && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-indigo-700 uppercase tracking-wide">
                      Draft Tone: {draftedTone || 'Polished Hospitality'}
                    </span>
                    <span className="text-gray-400">Character preview</span>
                  </div>

                  {draftedSubject && (
                    <div className="text-xs font-bold text-gray-800">
                      Subject: <span className="font-medium text-gray-600">{draftedSubject}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-white border border-gray-200 p-3 rounded-xl max-h-48 overflow-y-auto">
                    {draftedMessage}
                  </div>

                  {draftedExplanation && (
                    <div className="text-[10px] text-gray-500 leading-relaxed italic bg-indigo-50/40 p-2.5 rounded-lg border-l-2 border-indigo-400">
                      <strong>AI Explanation:</strong> {draftedExplanation}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setDraftedMessage('');
                    setIsCustomMessageOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!draftedMessage}
                  onClick={handleSendDraft}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Simulate Message Outbox
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
