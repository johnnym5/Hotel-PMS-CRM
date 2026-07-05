'use client';

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, Send, Mail, MessageSquare, Phone, Users, CheckCircle, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Guest, InteractionLog } from '../lib/mockData';

interface CampaignsManagerProps {
  guests: Guest[];
  onTriggerCampaign: (logs: Omit<InteractionLog, 'id' | 'dateSent' | 'status'>[]) => void;
}

export default function CampaignsManager({
  guests,
  onTriggerCampaign,
}: CampaignsManagerProps) {
  // Trigger active toggles
  const [triggers, setTriggers] = useState({
    preArrival: true,
    duringStay: true,
    postStay: true,
  });

  // Campaign Segment builder states
  const [selectedSegment, setSelectedSegment] = useState('Abuja VIPs');
  const [campaignChannel, setCampaignChannel] = useState<'Email' | 'WhatsApp' | 'SMS'>('Email');
  const [campaignGoal, setCampaignGoal] = useState('Re-engagement');
  const [customBrief, setCustomBrief] = useState('');
  
  // Generation state
  const [isDrafting, setIsDrafting] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignTone, setCampaignTone] = useState('');
  const [campaignExplanation, setCampaignExplanation] = useState('');
  const [hasDeployed, setHasDeployed] = useState(false);

  // Helper to toggle triggers
  const handleToggle = (key: keyof typeof triggers) => {
    setTriggers({
      ...triggers,
      [key]: !triggers[key],
    });
  };

  // Get matching guests count based on chosen segment
  const getSegmentMatchingGuests = (seg: string) => {
    switch (seg) {
      case 'Abuja VIPs':
        return guests.filter((g) => g.location === 'Abuja' && (g.loyaltyTier === 'VIP' || g.loyaltyTier === 'Platinum'));
      case 'Lagos Gold & Platinum':
        return guests.filter((g) => g.location === 'Lagos' && (g.loyaltyTier === 'Gold' || g.loyaltyTier === 'Platinum' || g.loyaltyTier === 'VIP'));
      case 'All VIP Patrons':
        return guests.filter((g) => g.loyaltyTier === 'VIP' || g.loyaltyTier === 'Platinum');
      case 'Short-Let Guests':
        return guests.filter((g) => g.tags.includes('Short-Let'));
      default:
        return guests;
    }
  };

  const matchingGuests = getSegmentMatchingGuests(selectedSegment);

  // Draft Segment Template via Gemini
  const handleDraftSegmentCampaign = async () => {
    setIsDrafting(true);
    setCampaignBody('');
    setHasDeployed(false);
    
    // Choose a representative guest for drafting context, or generalize
    const sampleGuest = matchingGuests[0] || guests[0];
    const nameToUse = sampleGuest ? `${sampleGuest.firstName} ${sampleGuest.lastName}` : "Valued Patron";
    const tierToUse = sampleGuest ? sampleGuest.loyaltyTier : "Elite";
    
    try {
      const response = await fetch('/api/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: campaignGoal,
          channel: campaignChannel,
          guestName: "{{firstName}} {{lastName}}", // template interpolation tags
          loyaltyTier: "{{loyaltyTier}}",
          preferences: ["{{roomPreference}}", "{{foodPreference}}"],
          customPrompt: `Segment chosen is '${selectedSegment}'. Core marketing direction: ${customBrief || "15% off repeat booking discount with promo code DIRECT15"}. State clearly how we value their specific preferred room configurations.`,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setCampaignBody(`Error: ${data.error}`);
      } else {
        setCampaignSubject(data.subject || '');
        setCampaignBody(data.message || '');
        setCampaignTone(data.tone || '');
        setCampaignExplanation(data.explanation || '');
      }
    } catch (err) {
      console.error(err);
      setCampaignBody('Failed to connect to campaign generator server.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Deploy simulated bulk campaign
  const handleDeployCampaign = () => {
    if (!campaignBody || matchingGuests.length === 0) return;

    // Create interaction logs for each matching guest, replacing the templates with actual guest metrics
    const logsToCreate = matchingGuests.map((guest) => {
      // Simple template interpolation helper
      let finalMsg = campaignBody
        .replace(/\{\{firstName\}\}/g, guest.firstName)
        .replace(/\{\{lastName\}\}/g, guest.lastName)
        .replace(/\{\{loyaltyTier\}\}/g, guest.loyaltyTier)
        .replace(/\{\{roomPreference\}\}/g, 'preferred floor configurations')
        .replace(/\{\{foodPreference\}\}/g, 'amenities');

      return {
        guestId: guest.id,
        type: 'Campaign' as const,
        channel: campaignChannel,
        content: campaignSubject ? `Subject: ${campaignSubject}\n\n${finalMsg}` : finalMsg,
      };
    });

    onTriggerCampaign(logsToCreate);
    setHasDeployed(true);
    // clear draft
    setCampaignBody('');
  };

  return (
    <div className="space-y-6" id="campaigns-manager-module">
      {/* Automated Triggers Status Panels */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1">
          <CheckCircle className="w-5 h-5 text-amber-600" />
          Automated Guest Communications Loops
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          Toggle automatic systems that listen for PMS check-in/check-out events to fire communication router triggers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pre-arrival */}
          <div className="border border-gray-100 rounded-2xl p-4.5 bg-gray-50/20 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  Pre-Arrival Loop
                </span>
                <button onClick={() => handleToggle('preArrival')} className="cursor-pointer text-gray-600 hover:text-amber-600 transition">
                  {triggers.preArrival ? (
                    <ToggleRight className="w-8 h-8 text-amber-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>
              <h3 className="text-sm font-bold text-gray-800">3 Days Prior Check-In</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Queries Guest database for past stays. Auto-dispatches directions, airport transfers, and registers pre-saved pillows/temp preferences.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
              Status: <span className={triggers.preArrival ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{triggers.preArrival ? '● System Active' : '○ Disabled'}</span>
            </div>
          </div>

          {/* During Stay */}
          <div className="border border-gray-100 rounded-2xl p-4.5 bg-gray-50/20 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                  During-Stay Welcomer
                </span>
                <button onClick={() => handleToggle('duringStay')} className="cursor-pointer text-gray-600 hover:text-amber-600 transition">
                  {triggers.duringStay ? (
                    <ToggleRight className="w-8 h-8 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>
              <h3 className="text-sm font-bold text-gray-800">2 Hours After Arrival</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Fires a welcome check-in WhatsApp greeting inquiring if their suite setup matches criteria. Escalates complaints instantly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
              Status: <span className={triggers.duringStay ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{triggers.duringStay ? '● System Active' : '○ Disabled'}</span>
            </div>
          </div>

          {/* Post Stay Loop */}
          <div className="border border-gray-100 rounded-2xl p-4.5 bg-gray-50/20 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  Post-Checkout Survey
                </span>
                <button onClick={() => handleToggle('postStay')} className="cursor-pointer text-gray-600 hover:text-amber-600 transition">
                  {triggers.postStay ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>
              <h3 className="text-sm font-bold text-gray-800">24 Hours After Departure</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Dispatches a rating review invite. 4-5 stars receive loyalty perks. 1-3 stars trigger immediate manager alerts for resolving grievances.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
              Status: <span className={triggers.postStay ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{triggers.postStay ? '● System Active' : '○ Disabled'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Segment Builder (AI Copilot) */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings column */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            1. Campaign Segment Scope
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target Customer Segment</label>
            <select
              value={selectedSegment}
              onChange={(e) => {
                setSelectedSegment(e.target.value);
                setCampaignBody('');
                setHasDeployed(false);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:border-amber-500"
            >
              <option value="Abuja VIPs">Abuja-based VIP & Platinum Patrons</option>
              <option value="Lagos Gold & Platinum">Lagos-based Gold/Platinum Patrons</option>
              <option value="All VIP Patrons">All VIP & Platinum Patrons</option>
              <option value="Short-Let Guests">Guests Tagged &apos;Short-Let&apos;</option>
            </select>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/40">
            <span className="text-[10px] font-bold text-indigo-700 block uppercase tracking-wide">
              Segment Match Metrics
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">
              {matchingGuests.length} Guests Match
            </span>
            <div className="mt-2 text-xs text-indigo-700/80 leading-relaxed font-sans">
              Matching names: {matchingGuests.map((g) => `${g.firstName} ${g.lastName}`).join(', ') || 'No guests match criteria'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <select
                value={campaignChannel}
                onChange={(e) => setCampaignChannel(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none"
              >
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal</label>
              <select
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none"
              >
                <option value="Re-engagement">Re-engagement</option>
                <option value="Seasonal Special">Seasonal Special</option>
                <option value="Loyalty Upgrade">Loyalty Promotion</option>
                <option value="Feedback Request">Feedback Request</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Custom Campaign Directives / Brief</label>
            <textarea
              rows={3}
              placeholder="e.g. Offer N20,000 spa voucher if they reserve a luxury room during July weekend using code SPAJULY."
              value={customBrief}
              onChange={(e) => setCustomBrief(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
            />
          </div>

          <button
            onClick={handleDraftSegmentCampaign}
            disabled={isDrafting || matchingGuests.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            {isDrafting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Drafting segment template...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Compile Segment Draft Template
              </>
            )}
          </button>
        </div>

        {/* Live template preview column */}
        <div className="lg:col-span-2 space-y-4 border-l border-gray-50 lg:pl-6">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
            2. Live Campaign Deployment Preview
          </h3>

          {!campaignBody && !hasDeployed ? (
            <div className="h-72 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-300">
              <Sparkles className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-xs">
                Select your parameters and click &quot;Compile Segment Draft Template&quot; to query Gemini.
              </p>
              <span className="text-[10px] text-gray-400 mt-1 max-w-sm block">
                The Gemini AI engine automatically builds a flexible template utilizing curly bracket replacement indicators.
              </span>
            </div>
          ) : hasDeployed ? (
            <div className="h-72 border border-emerald-100 bg-emerald-50/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-emerald-800">
              <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-sm font-bold">Simulated Bulk Dispatch Completed!</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Dispatched dynamic personalized direct communications to {matchingGuests.length} guests. Logs have been committed successfully to guest profiles.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide">
                    Tone: {campaignTone || 'Hospitality Luxe'}
                  </span>
                  <span className="text-gray-400">Dynamic Template Compilation</span>
                </div>

                {campaignSubject && (
                  <div className="text-xs font-extrabold text-gray-800 border-b border-gray-200/50 pb-2">
                    Email Subject Line: <span className="font-medium text-gray-600">{campaignSubject}</span>
                  </div>
                )}

                <div className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto bg-white p-3.5 rounded-xl border border-gray-200">
                  {campaignBody}
                </div>

                {campaignExplanation && (
                  <div className="text-[10px] text-gray-500 leading-relaxed italic bg-indigo-50/40 p-2.5 rounded-lg border-l-2 border-indigo-400">
                    <strong>Co-pilot Notes:</strong> {campaignExplanation}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-amber-50/40 border border-amber-100/60 p-4 rounded-xl text-xs text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Dynamic Replacements:</strong> When dispatching, parameters such as <code>{`{{firstName}}`}</code> will be automatically replaced with the guest&apos;s profile tags and custom preference details.
                </span>
              </div>

              <button
                onClick={handleDeployCampaign}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Simulate Bulk Dispatch Outbox ({matchingGuests.length} Guests)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
