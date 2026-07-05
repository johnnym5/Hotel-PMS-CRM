'use client';

import React, { useState } from 'react';
import { Search, Filter, Plus, User, MapPin, Tag, ArrowUpRight, Mail, Phone, Crown } from 'lucide-react';
import { Guest } from '../lib/mockData';

interface GuestsListProps {
  guests: Guest[];
  onSelectGuest: (guestId: string) => void;
  onAddGuest: (guest: Omit<Guest, 'id' | 'totalSpend'>) => void;
}

export default function GuestsList({
  guests,
  onSelectGuest,
  onAddGuest,
}: GuestsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    loyaltyTier: 'Standard' as Guest['loyaltyTier'],
    tagsString: '',
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) return;

    const tags = formData.tagsString
      ? formData.tagsString.split(',').map((t) => t.trim()).filter(Boolean)
      : ['New Guest'];

    onAddGuest({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || '+234',
      location: formData.location || 'Lagos',
      loyaltyTier: formData.loyaltyTier,
      tags: tags,
      avatarUrl: `https://picsum.photos/seed/${formData.firstName.toLowerCase()}/150`,
    });

    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      loyaltyTier: 'Standard',
      tagsString: '',
    });
    setIsAddOpen(false);
  };

  const getTierBadgeColor = (tier: Guest['loyaltyTier']) => {
    switch (tier) {
      case 'VIP':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Platinum':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Gold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Silver':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'Standard':
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredGuests = guests.filter((g) => {
    const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier = tierFilter === 'All' || g.loyaltyTier === tierFilter;

    return matchesSearch && matchesTier;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6" id="guest-list-module">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-3xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search guests by name, city, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-gray-800 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-xl focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Loyalty Tiers</option>
              <option value="VIP">VIP Tier</option>
              <option value="Platinum">Platinum Tier</option>
              <option value="Gold">Gold Tier</option>
              <option value="Silver">Silver Tier</option>
              <option value="Standard">Standard Tier</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Guest
          </button>
        </div>
      </div>

      {/* Guest Listing Grid */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Profile</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loyalty</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Region / City</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segments & Tags</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lifetime Value (LTV)</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No guest profiles found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/40 transition group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-50 border border-amber-100 flex items-center justify-center relative shadow-3xs">
                          {g.avatarUrl ? (
                            <img src={g.avatarUrl} alt={g.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-gray-800 block text-sm group-hover:text-amber-800 transition">
                            {g.firstName} {g.lastName}
                          </span>
                          <span className="text-[11px] text-gray-400 block mt-0.5">{g.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getTierBadgeColor(g.loyaltyTier)} flex items-center gap-1 w-fit`}>
                        <Crown className="w-3 h-3" />
                        {g.loyaltyTier}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {g.location}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {g.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium flex items-center gap-0.5"
                          >
                            <Tag className="w-2.5 h-2.5 text-gray-400" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(g.totalSpend)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectGuest(g.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-50 border border-gray-200 hover:border-amber-600 hover:bg-amber-50 text-gray-700 hover:text-amber-800 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        360 Profile
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Guest Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="p-6 bg-amber-50/50 border-b border-amber-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                Register New Patron
              </h3>
              <p className="text-xs text-gray-500 mt-1">Create a guest profile to begin tracking preference stay cycles.</p>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kola"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alao"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="kola@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+234 803 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Abuja"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loyalty Tier Status</label>
                  <select
                    value={formData.loyaltyTier}
                    onChange={(e) => setFormData({ ...formData, loyaltyTier: e.target.value as Guest['loyaltyTier'] })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white text-gray-800"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Segments (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="Corporate, VIP, Short-Let"
                    value={formData.tagsString}
                    onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Register Patron
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
