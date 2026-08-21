'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Tag, LogIn, User, Globe, Info, RefreshCw } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import { motion } from 'motion/react';
import { apiFetch } from '@/lib/api';

interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  price: number;
  isSeated: boolean;
  visibility: string;
  status: string;
  hall?: { id: string; name: string; address?: string } | null;
}

type FilterId = 'all' | 'free' | 'paid';

const FILTERS: { id: FilterId; name: string; emoji: string }[] = [
  { id: 'all', name: 'Tümü', emoji: '📋' },
  { id: 'free', name: 'Ücretsiz', emoji: '🎁' },
  { id: 'paid', name: 'Ücretli', emoji: '🎟️' },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<Event[]>('/events/public');
      setEvents(data);
    } catch (e: any) {
      // NOT: demo veri yüklenmiyor — demo etkinliklerin linkleri /event/1 gibi
      // gerçekte var olmayan sayfalara gidip "Bilet Bulunamadı" hatası veriyordu.
      setLoadError(e?.message || 'Etkinlikler yüklenemedi.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    // Check login state
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);
  }, [fetchEvents]);

  const filteredEvents = events.filter((e) => {
    if (filter === 'free') return !e.price || e.price <= 0;
    if (filter === 'paid') return e.price > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white pt-28 pb-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-6 shadow-inner">
            ✨ Premium Etkinlik Biletleme Platformu
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Etkinlikleri Keşfet, <span className="gradient-text">Biletini Kolayca Al</span>
          </h1>
          <p className="text-lg md:text-xl text-indigo-100/90 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            En sevdiğiniz konserler, tiyatrolar ve özel organizasyonlar için koltuğunuzu harita üzerinden anında seçin.
          </p>

          {/* Category Filter Tabs — gerçek veriye dayalı filtreler */}
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {FILTERS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 min-h-[44px] ${
                  filter === cat.id
                    ? 'bg-white text-indigo-900 shadow-lg shadow-indigo-500/20 scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Calendar className="text-indigo-600" size={32} />
          Yaklaşan Etkinlikler
        </h2>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        ) : loadError ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <Info className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Etkinlikler Yüklenemedi</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{loadError}</p>
            <button
              onClick={fetchEvents}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
            >
              <RefreshCw size={18} /> Tekrar Dene
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <Calendar className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {filter === 'all' ? 'Henüz Etkinlik Yok' : 'Bu Filtrede Etkinlik Yok'}
            </h2>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'Yakında yeni etkinliklerle karşınızda olacağız.'
                : 'Filtreyi değiştirerek diğer etkinliklere göz atabilirsiniz.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
              >
                <Link
                  href={`/event/${event.id}`}
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.1)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
                >
                  <div className="h-48 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center relative">
                    <span className="text-4xl font-bold text-blue-900 opacity-20 uppercase px-4 text-center">{event.name}</span>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-blue-900 shadow-sm">
                      {event.price > 0 ? `${event.price} ₺` : 'ÜCRETSİZ'}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{event.name}</h3>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Calendar size={16} className="text-blue-500" />
                        <span>{new Date(event.date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Istanbul' })}</span>
                      </div>
                      {event.isSeated && event.hall ? (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <MapPin size={16} className="text-blue-500" />
                          <span>{event.hall.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Tag size={16} className="text-blue-500" />
                          <span>Genel Giriş (Ayakta)</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center transition shadow hover:shadow-lg">
                      Bilet Al
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
