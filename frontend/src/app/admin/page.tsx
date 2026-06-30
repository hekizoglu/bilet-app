"use client";

import { useState, useEffect } from 'react';
import { Calendar, Users, MapIcon, DollarSign, ArrowRight, Loader2, Award } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchStats = async () => {
    try {
      const token = getCookie('token');
      const res = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Dashboard stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> İstatistikler Yükleniyor...
      </div>
    );
  }

  const defaultStats = stats || {
    eventsCount: 0,
    hallsCount: 0,
    pendingReservations: 0,
    totalEarnings: 0
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Award className="text-blue-600" />
          Yönetim Paneli
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign size={80} className="text-green-600" />
          </div>
          <h3 className="text-gray-500 font-medium text-sm mb-1">Toplam Ciro (Onaylı Biletler)</h3>
          <p className="text-3xl font-extrabold text-gray-950 mt-2">{defaultStats.totalEarnings.toLocaleString('tr-TR')} ₺</p>
          <div className="mt-4 text-xs font-semibold text-green-700 flex items-center gap-1">
            <span>Banka EFT/Havale & Kredi Kartı</span>
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <Link 
          href="/admin/reservations" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={80} className="text-orange-500" />
          </div>
          <h3 className="text-gray-500 font-medium text-sm mb-1">Bekleyen Rezervasyonlar</h3>
          <p className={`text-3xl font-extrabold mt-2 ${defaultStats.pendingReservations > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {defaultStats.pendingReservations}
          </p>
          <div className="mt-4 text-xs font-semibold text-orange-700 flex items-center gap-1 hover:underline">
            <span>Rezervasyonları Kontrol Et</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        {/* Card 3: Events */}
        <Link 
          href="/admin/events" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Calendar size={80} className="text-blue-600" />
          </div>
          <h3 className="text-gray-500 font-medium text-sm mb-1">Aktif Etkinlikler</h3>
          <p className="text-3xl font-extrabold text-gray-950 mt-2">{defaultStats.eventsCount}</p>
          <div className="mt-4 text-xs font-semibold text-blue-700 flex items-center gap-1 hover:underline">
            <span>Etkinlik Yönetimi</span>
            <ArrowRight size={12} />
          </div>
        </Link>

        {/* Card 4: Halls */}
        <Link 
          href="/admin/halls" 
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <MapIcon size={80} className="text-indigo-600" />
          </div>
          <h3 className="text-gray-500 font-medium text-sm mb-1">Kayıtlı Salonlar</h3>
          <p className="text-3xl font-extrabold text-gray-950 mt-2">{defaultStats.hallsCount}</p>
          <div className="mt-4 text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:underline">
            <span>Oturma Düzeni Tasarımcısı</span>
            <ArrowRight size={12} />
          </div>
        </Link>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
        <h2 className="text-xl font-bold text-blue-900 mb-2 flex items-center gap-2">
          👋 Hoş Geldiniz!
        </h2>
        <p className="text-blue-800 text-sm max-w-2xl leading-relaxed">
          Bilet ve Rezervasyon yönetim sistemine hoş geldiniz. Sol taraftaki navigasyonu kullanarak 
          yeni etkinlikler oluşturabilir, salon çizimlerini hazırlayabilir, ödeme bildirimlerini 
          onaylayabilir veya gelen biletlerin kapı giriş kontrolünü (Check-in) yapabilirsiniz.
        </p>
      </div>
    </div>
  );
}
