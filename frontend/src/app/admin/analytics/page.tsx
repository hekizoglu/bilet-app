"use client";
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    liveUsers: 1 // Simulation of admin + others
  });

  const [salesEvents, setSalesEvents] = useState<any[]>([]);

  useEffect(() => {
    // İlk yüklemede mevcut satış verilerini (stats) de çekebiliriz
    // Şimdilik sadece canlı dinliyoruz.
    const fetchInitialStats = async () => {
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(prev => ({
            ...prev,
            totalSales: data.totalReservations || 0,
            totalRevenue: data.totalEarnings || 0
          }));
        }
      } catch (err) {}
    };
    fetchInitialStats();

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(API_BASE, {
      withCredentials: true
    });

    socket.on('connect', () => {
      socket.emit('join_admin'); // Admin room'a katıl
    });

    socket.on('new_sale', (data) => {
      setStats(prev => ({
        ...prev,
        totalSales: prev.totalSales + 1,
        totalRevenue: prev.totalRevenue + (data.amount || 0)
      }));

      setSalesEvents(prev => [{ time: new Date().toLocaleTimeString(), amount: data.amount, eventId: data.eventId }, ...prev].slice(0, 10));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" />
          Canlı Analitik Dashboard
        </h1>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          CANLI BAĞLANTI AKTİF
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <TrendingUp />
          </div>
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">Toplam Ciro</h3>
          <p className="text-4xl font-black text-gray-900">{(stats.totalRevenue || 0).toFixed(2)} ₺</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4">
            <BarChart3 />
          </div>
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">Toplam Bilet</h3>
          <p className="text-4xl font-black text-gray-900">{stats.totalSales}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
            <Users />
          </div>
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">Aktif Yöneticiler</h3>
          <p className="text-4xl font-black text-gray-900">{stats.liveUsers}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 border-b pb-4">Son Satış İşlemleri (Canlı Akış)</h2>
        {salesEvents.length === 0 ? (
          <div className="text-center p-8 text-gray-400 font-medium">
            Yeni bilet satışları beklendiğinde bu alana düşecektir...
          </div>
        ) : (
          <div className="space-y-3">
            {salesEvents.map((ev, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition animate-fade-in-down">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-mono text-sm text-gray-500">{ev.time}</span>
                  <span className="font-medium text-gray-900 text-sm">Etkinlik ID: {ev.eventId}</span>
                </div>
                <span className="font-bold text-green-600">+{(ev.amount || 0).toFixed(2)} ₺</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
