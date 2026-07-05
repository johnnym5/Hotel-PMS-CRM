'use client';

import React, { useState } from 'react';
import { Kanban, Plus, TrendingUp, DollarSign, ArrowRight, ArrowLeft, Trash2, Mail, Phone, CalendarRange } from 'lucide-react';
import { Enquiry } from '../lib/mockData';

interface EnquiryPipelineProps {
  enquiries: Enquiry[];
  onAddEnquiry: (enquiry: Omit<Enquiry, 'id' | 'createdAt'>) => void;
  onUpdateEnquiryStage: (enquiryId: string, newStage: Enquiry['stage']) => void;
  onDeleteEnquiry: (enquiryId: string) => void;
}

const STAGES: Enquiry['stage'][] = [
  'Enquiry Received',
  'Proposal Sent',
  'Contract Negotiating',
  'Confirmed / Paid',
];

export default function EnquiryPipeline({
  enquiries,
  onAddEnquiry,
  onUpdateEnquiryStage,
  onDeleteEnquiry,
}: EnquiryPipelineProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    type: 'Corporate Group' as Enquiry['type'],
    estimatedRevenue: 500000,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName || !formData.email || !formData.phone) return;
    onAddEnquiry({
      contactName: formData.contactName,
      companyName: formData.companyName || undefined,
      email: formData.email,
      phone: formData.phone,
      type: formData.type,
      estimatedRevenue: Number(formData.estimatedRevenue),
      stage: 'Enquiry Received',
      notes: formData.notes,
    });
    setFormData({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      type: 'Corporate Group',
      estimatedRevenue: 500000,
      notes: '',
    });
    setIsAddOpen(false);
  };

  const getStageColor = (stage: Enquiry['stage']) => {
    switch (stage) {
      case 'Enquiry Received':
        return 'border-sky-500 bg-sky-50/50 text-sky-800';
      case 'Proposal Sent':
        return 'border-amber-500 bg-amber-50/50 text-amber-800';
      case 'Contract Negotiating':
        return 'border-indigo-500 bg-indigo-50/50 text-indigo-800';
      case 'Confirmed / Paid':
        return 'border-emerald-500 bg-emerald-50/50 text-emerald-800';
    }
  };

  // Calculate Pipeline revenue summaries
  const totalValue = enquiries.reduce((sum, item) => sum + item.estimatedRevenue, 0);
  const activeValue = enquiries
    .filter((e) => e.stage !== 'Confirmed / Paid')
    .reduce((sum, item) => sum + item.estimatedRevenue, 0);
  const wonValue = enquiries
    .filter((e) => e.stage === 'Confirmed / Paid')
    .reduce((sum, item) => sum + item.estimatedRevenue, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6" id="enquiry-pipeline-module">
      {/* Top statistics summary panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-400 block uppercase tracking-wider">
              Total Pipeline Leads
            </span>
            <span className="text-2xl font-bold text-gray-800 mt-1 block">
              {enquiries.length} Enquiries
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              All active & won event spaces/groups
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Kanban className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-400 block uppercase tracking-wider">
              Active Negotiating Revenue
            </span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              {formatCurrency(activeValue)}
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              Awaiting contract & proposals
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-medium text-gray-400 block uppercase tracking-wider">
              Closed / Paid Events
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {formatCurrency(wonValue)}
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              Direct booking conversion rate
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Kanban Pipeline and Title */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium tracking-tight text-gray-900 flex items-center gap-2">
              <Kanban className="w-5 h-5 text-amber-600" />
              Event & Group Enquiry Pipeline
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Track multi-room corporate bookings, wedding parties, and event rentals throughout the sales lifecycle.
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(!isAddOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-xl shadow-xs transition cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            Add Lead / Enquiry
          </button>
        </div>

        {/* Add Lead Form Collapse */}
        {isAddOpen && (
          <div className="bg-gray-50/50 border-b border-gray-100 p-6 animate-fadeIn">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Create New Event Booking Enquiry</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kolawole Davies"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. MTN Nigeria (Optional)"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Enquiry Package Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Enquiry['type'] })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                >
                  <option value="Corporate Group">Corporate Group Room Bookings</option>
                  <option value="Wedding">Wedding Party Room block</option>
                  <option value="Event Space">Banquet Hall / Event Space Rental</option>
                  <option value="Long Stay">Long Stay Short-Let Package</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+234 80..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Budget / Revenue (NGN) *</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={50000}
                  value={formData.estimatedRevenue}
                  onChange={(e) => setFormData({ ...formData, estimatedRevenue: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Enquiry Scope / Client Requirements</label>
                <textarea
                  rows={2}
                  placeholder="Specify dates, catering, conference setup details, or preferred room block counts..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-sm transition cursor-pointer"
                >
                  Save Enquiry to Pipeline
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Board Columns Grid */}
        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[900px]">
            {STAGES.map((stage, stageIndex) => {
              const stageEnquiries = enquiries.filter((e) => e.stage === stage);
              const stageTotal = stageEnquiries.reduce((sum, item) => sum + item.estimatedRevenue, 0);

              return (
                <div key={stage} className="bg-gray-50/50 rounded-2xl p-4 flex flex-col min-h-[500px] border border-gray-50">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full border-2 ${
                        stageIndex === 0
                          ? 'bg-sky-500 border-sky-100'
                          : stageIndex === 1
                          ? 'bg-amber-500 border-amber-100'
                          : stageIndex === 2
                          ? 'bg-indigo-500 border-indigo-100'
                          : 'bg-emerald-500 border-emerald-100'
                      }`} />
                      <h4 className="text-sm font-semibold text-gray-800 tracking-tight">
                        {stage}
                      </h4>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                      {stageEnquiries.length}
                    </span>
                  </div>

                  {/* Estimated stage revenue */}
                  <div className="mb-4 text-xs font-medium text-gray-500">
                    Est. Value: <span className="font-bold text-gray-800">{formatCurrency(stageTotal)}</span>
                  </div>

                  {/* Enquiry Cards */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
                    {stageEnquiries.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-xs">
                        No leads in stage
                      </div>
                    ) : (
                      stageEnquiries.map((enq) => (
                        <div
                          key={enq.id}
                          className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition flex flex-col group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                                {enq.type}
                              </span>
                              <h5 className="text-sm font-bold text-gray-800 mt-1.5 leading-tight">
                                {enq.companyName ? `${enq.companyName}` : enq.contactName}
                              </h5>
                              {enq.companyName && (
                                <span className="text-xs text-gray-400 block mt-0.5">
                                  Attn: {enq.contactName}
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={() => onDeleteEnquiry(enq.id)}
                              className="text-gray-300 hover:text-red-600 p-1 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete Enquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg line-clamp-3 leading-relaxed">
                            {enq.notes}
                          </div>

                          {/* Contact Details */}
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {enq.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {enq.phone}
                            </span>
                          </div>

                          {/* Price & Actions */}
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-700">
                              {formatCurrency(enq.estimatedRevenue)}
                            </span>

                            {/* Move buttons */}
                            <div className="flex items-center gap-1">
                              {stageIndex > 0 && (
                                <button
                                  onClick={() => onUpdateEnquiryStage(enq.id, STAGES[stageIndex - 1])}
                                  className="p-1 border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg cursor-pointer"
                                  title={`Move back to ${STAGES[stageIndex - 1]}`}
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {stageIndex < STAGES.length - 1 && (
                                <button
                                  onClick={() => onUpdateEnquiryStage(enq.id, STAGES[stageIndex + 1])}
                                  className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg cursor-pointer"
                                  title={`Promote to ${STAGES[stageIndex + 1]}`}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
