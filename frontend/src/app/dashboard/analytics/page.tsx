"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BarChart3, TrendingUp, Clock, CalendarDays, Wallet } from 'lucide-react';
import { apiFetch, API_ORIGIN, getToken } from '@/lib/api';

interface SaleEvent {
  id?: string;
  customer?: string;
  seatName?: string | null;
  status?: string;
  paymentStatus?: string;
  time: string | Date;
  amount: number;
  eventId?: string;
  eventName?: string;
}

interface AdminStats {
  eventsCount?: number;
  hallsCount?: number;
  pendingReservations?: number;
  totalReservations?: number;
  totalEarnings?: number;
  recentSales?: SaleEvent[];
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats>({});
  const [salesEvents, setSalesEvents] = useState<SaleEvent[]>([]);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  // Son 24 saatin satış dağılımı (canlı satış akışından türetilir — basit CSS bar chart)
  const [hourlySales, setHourlySales] = useState<number[]>(() => Array(24).fill(0));
  const currentHour = new Date().getHours();

  const recordSale = useCallback((sale: SaleEvent) => {
    setSalesEvents(prev => [sale, ...prev].slice(0, 12));
    setHourlySales(prev => {
      const hour = new Date().getHours();
      const next = [...prev];
      next[hour] = (next[hour] || 0) + 1;
      return next;
    });
  }, []);

  useEffect(() => {
    const token = getToken();

    // 1) Mevcut istatistikleri + son satışları yükle (sayfa açılır açılmaz geçmiş görünsün)
    apiFetch<AdminStats>('/admin/stats')
      .then((data) => {
        setStats(data);
        if (data.recentSales?.length) {
          setSalesEvents(data.recentSales.map(r => ({ ...r, amount: Number(r.amount) || 0 })));
        }
      })
      .catch(() => {});

    // 2) Canlı satış akışı (socket) — NEXT_PUBLIC_API_URL /api ile bitse bile doğru origin
    const socket = io(API_ORIGIN, { withCredentials: true });

    socket.on('connect', () => {
      setSocketStatus('live');
      socket.emit('join_admin', { token });
    });
    socket.on('disconnect', () => setSocketStatus('offline'));
    socket.on('connect_error', () => setSocketStatus('offline'));

    socket.on('new_sale', (data: { amount?: number; eventId?: string; status?: string }) => {
      const amount = Number(data.amount) || 0;
      setStats(prev => ({
        ...prev,
        totalReservations: (prev.totalReservations || 0) + 1,
        totalEarnings: (prev.totalEarnings || 0) + amount
      }));
      recordSale({ amount, eventId: data.eventId, eventName: 'Canlı satış', time: new Date(), status: data.status });
    });

    return () => {
      socket.disconnect();
    };
  }, [recordSale]);

  const totalRevenue = Number(stats.totalEarnings || 0);
  const totalSales = Number(stats.totalReservations || 0);
  const pendingCount = Number(stats.pendingReservations || 0);
  const eventsCount = Number(stats.eventsCount || 0);

  const maxHour = Math.max(1, ...hourlySales);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" />
          Canlı Analitik Dashboard
        </h1>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
          socketStatus === 'live'
            ? 'bg-green-50 text-green-700'
            : socketStatus === 'connecting'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${
            socketStatus === 'live' ? 'bg-green-500 animate-pulse' : socketStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
          }`}></span>
          {socketStatus === 'live' ? 'CANLI BAĞLANTI AKTİF' : socketStatus === 'connecting' ? 'BAĞLANIYOR...' : 'BAĞLANTI KOPUK'}
        </div>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Toplam Ciro</h3>
          <p className="text-3xl font-black text-gray-900">{totalRevenue.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-11 h-11 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Toplam Bilet / Rezervasyon</h3>
          <p className="text-3xl font-black text-gray-900">{totalSales}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Onay Bekleyen</h3>
          <p className="text-3xl font-black text-gray-900">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">Ödeme doğrulaması bekliyor</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-3">
            <CalendarDays size={20} />
          </div>
          <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Aktif Etkinlik</h3>
          <p className="text-3xl font-black text-gray-900">{eventsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Son 24 saat mini grafik */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" /> Son 24 Saat Satış Dağılımı
          </h2>
          <div className="flex items-end gap-1 h-32">
            {hourlySales.map((v, i) => {
              const isNow = i === currentHour;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      isNow ? 'bg-blue-600' : 'bg-blue-200 group-hover:bg-blue-400'
                    }`}
                    style={{ height: `${Math.max(3, (v / maxHour) * 100)}%` }}
                    title={`${i}:00 — ${v} satış`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1.5">
            <span>00:00</span>
            <span className="text-blue-600 font-bold">ŞİMDİ</span>
            <span>23:00</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Canlı satış akışındaki her yeni satış, bulunduğu saatin çubuğunu artırır.
          </p>
        </div>

        {/* Son satış akışı */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 border-b pb-3">Son Satış İşlemleri (Canlı Akış)</h2>
          {salesEvents.length === 0 ? (
            <div className="text-center p-10 text-gray-400 font-medium">
              Henüz satış verisi yok. Yeni bilet satışları burada görünecek...
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {salesEvents.map((ev, i) => {
                const timeStr = ev.time
                  ? new Date(ev.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '—';
                const isLive = i === 0 && Date.now() - new Date(ev.time).getTime() < 15000;
                return (
                  <div
                    key={ev.id || i}
                    className={`flex justify-between items-center gap-3 p-3.5 rounded-xl transition ${
                      isLive ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-green-500 animate-pulse' : 'bg-green-500/50'}`}></span>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{ev.eventName || `Etkinlik ${ev.eventId || ''}`}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {ev.customer ? `${ev.customer}${ev.seatName ? ` • ${ev.seatName}` : ''}` : (ev.eventId ? `ID: ${ev.eventId}` : '')} • {timeStr}
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold text-sm shrink-0 ${ev.paymentStatus === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                      +{Number(ev.amount || 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
