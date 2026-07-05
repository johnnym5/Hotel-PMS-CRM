'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Heart, Users, DollarSign, PieChartIcon } from 'lucide-react';
import { Guest, Reservation, Enquiry } from '../lib/mockData';

interface AnalyticsReportsProps {
  guests: Guest[];
  reservations: Reservation[];
  enquiries: Enquiry[];
}

const COLORS = ['#4f46e5', '#8b5cf6', '#f59e0b', '#0ea5e9', '#10b981', '#ef4444'];

export default function AnalyticsReports({
  guests,
  reservations,
  enquiries,
}: AnalyticsReportsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
        Syncing and loading interactive analytical visualization charts...
      </div>
    );
  }

  // 1. Calculate stats
  const totalRevenue = guests.reduce((sum, g) => sum + g.totalSpend, 0);
  const averageSpend = guests.length > 0 ? totalRevenue / guests.length : 0;
  
  // Calculate average rating (NPS) from preloaded/mock scores
  // Let's assume we score guests from interaction feedback: Tunde Alao (5), Amara Okafor (4), Chioma Ade (4), David Cole (5), Fatima Yusuf (2)
  const feedbackScores = [5, 4, 4, 5, 2];
  const avgNpsRating = feedbackScores.reduce((sum, val) => sum + val, 0) / feedbackScores.length;
  // NPS Score = % Promoters (4-5) - % Detractors (0-3)
  const promoters = feedbackScores.filter(s => s >= 4).length;
  const detractors = feedbackScores.filter(s => s <= 3).length;
  const npsScoreValue = Math.round(((promoters - detractors) / feedbackScores.length) * 100);

  // 2. Prepare Guest LTV Data (Top Spenders)
  const ltvData = [...guests]
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .map(g => ({
      name: `${g.firstName} ${g.lastName.substring(0, 1)}.`,
      LTV: g.totalSpend,
      Tier: g.loyaltyTier,
    }));

  // 3. Prepare Segment Revenue Breakdown
  // Segments are: Corporate, VIP, Frequent Flyer, Short-Let, Leisure
  const segmentRevenue: Record<string, number> = {};
  guests.forEach(g => {
    g.tags.forEach(tag => {
      segmentRevenue[tag] = (segmentRevenue[tag] || 0) + g.totalSpend / g.tags.length; // distribute spend among tags
    });
  });
  const segmentData = Object.keys(segmentRevenue).map(key => ({
    name: key,
    value: Math.round(segmentRevenue[key]),
  }));

  // 4. Booking Source Distribution
  const sourceCount: Record<string, number> = {};
  reservations.forEach(r => {
    sourceCount[r.bookingSource] = (sourceCount[r.bookingSource] || 0) + 1;
  });
  const bookingSourceData = Object.keys(sourceCount).map(key => ({
    name: key,
    value: sourceCount[key],
  }));

  // 5. Monthly Revenue Forecast Trend (from booking totals over mock periods)
  const revenueTrendData = [
    { month: 'Jan', revenue: 1200000 },
    { month: 'Feb', revenue: 1450000 },
    { month: 'Mar', revenue: 1900000 },
    { month: 'Apr', revenue: 1600000 },
    { month: 'May', revenue: 2300000 },
    { month: 'Jun', revenue: 3100000 },
    { month: 'Jul (YTD)', revenue: totalRevenue },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6" id="analytics-reports-module">
      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Total Captured Portfolio</span>
            <span className="text-2xl font-bold text-gray-800 mt-1 block">{formatCurrency(totalRevenue)}</span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">↑ 12.4% vs last quarter</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Net Promoter Score (NPS)</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">+{npsScoreValue}</span>
            <span className="text-[11px] text-gray-500 mt-1 block">Based on {feedbackScores.length} post-stay loops</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Average Customer Spend</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">{formatCurrency(averageSpend)}</span>
            <span className="text-[11px] text-gray-500 mt-1 block">Premium tier spends are higher</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Direct Booking Ratio</span>
            <span className="text-2xl font-bold text-sky-600 mt-1 block">
              {Math.round(((reservations.filter(r => r.bookingSource === 'Direct').length) / (reservations.length || 1)) * 100)}%
            </span>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Avoids OTA commissions</span>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Lifetime Value (LTV) bar chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                Customer Lifetime Value (LTV)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Top-spending hotel patrons currently on record</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ltvData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `₦${val/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total Spent']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Bar dataKey="LTV" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Performance Trend */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Capture Revenue Progression (YTD)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Monthly tracking of guest spending cycle</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `₦${val/1000000}M`} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Tags/Segments Distribution */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Guest Segment Revenue Split
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Revenue contributions per profile tag grouping</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {segmentData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Source Breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                OTA vs. Direct Booking Sources
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Distribution of reservations by channel</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={75}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {bookingSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Bookings`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {bookingSourceData.map((item, idx) => {
                const percentage = Math.round((item.value / (reservations.length || 1)) * 100);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 block">{item.value} reservation{item.value > 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-gray-400">{percentage}% booking share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
