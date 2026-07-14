'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowRight, Filter, Zap, Tag, LogIn, User, Globe, Info } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import { motion } from 'framer-motion';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  reserved: number;
  category: string;
  hasSeating: boolean;
  price?: number;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchEvents();
    // Check login state
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/public`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        // Fallback demo events
        setEvents(demoEvents);
      }
    } catch (e) {
      console.log('API çalışmıyor, demo veriler yükleniyor');
      setEvents(demoEvents);
    }
    setLoading(false);
  }

  const demoEvents: Event[] = [
    {
      id: '1',
      name: 'Konser 2026 - Açılış Gecesi',
      description: 'Yılın en büyük konser etkinliği!',
      date: '2026-07-15T20:00:00Z',
      location: 'İstanbul Konser Salonu',
      capacity: 500,
      reserved: 350,
      category: 'konser',
      hasSeating: true,
      price: 150,
    },
    {
      id: '2',
      name: 'Tiyatro - Hamlet',
      description: 'Klasik tiyatro oyunu',
      date: '2026-07-20T19:30:00Z',
      location: 'Devlet Tiyatrosu',
      capacity: 300,
      reserved: 180,
      category: 'tiyatro',
      hasSeating: true,
      price: 100,
    },
    {
      id: '3',
      name: 'Üniversite Balosu',
      description: 'Genel katılım açık etkinlik',
      date: '2026-08-01T22:00:00Z',
      location: 'Üniversite Spor Salonu',
      capacity: 1000,
      reserved: 520,
      category: 'balon',
      hasSeating: false,
      price: 200,
    },
    {
      id: '4',
      name: 'Film Festivali - Açılış',
      description: 'Uluslararası film festivali',
      date: '2026-07-10T18:00:00Z',
      location: 'Sinema Merkezi',
      capacity: 400,
      reserved: 290,
      category: 'sinema',
      hasSeating: true,
      price: 75,
    },
  ];

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.category === filter);

  const categories = [
    { id: 'all', name: 'Tümü', emoji: '📋' },
    { id: 'konser', name: 'Konser', emoji: '🎵' },
    { id: 'tiyatro', name: 'Tiyatro', emoji: '🎭' },
    { id: 'sinema', name: 'Sinema', emoji: '🎬' },
    { id: 'balon', name: 'Balon', emoji: '🎉' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <div className="bg-blue-900 text-white pt-24 pb-20 px-4 text-center relative">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Hoş Geldiniz</h1>
        <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
          En sevdiğiniz konserler, tiyatrolar ve özel organizasyonlar için biletlerinizi hemen ayırtın.
        </p>
      </div>

      {/* Events Grid */}
      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Calendar className="text-blue-600" size={32} />
          Yaklaşan Etkinlikler
        </h2>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <Calendar className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Henüz Etkinlik Yok</h2>
            <p className="text-gray-500">Yakında yeni etkinliklerle karşınızda olacağız.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: any, index: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link 
                  href={`/event/${event.id}`} 
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.1)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
                >
                  <div className="h-48 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center relative">
                    <span className="text-4xl font-bold text-blue-900 opacity-20 uppercase px-4 text-center">{event.name}</span>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-blue-900 shadow-sm">
                      {event.price && event.price > 0 ? `${event.price} ₺` : 'ÜCRETSİZ'}
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

                    <div 
                      className="mt-auto w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center transition shadow hover:shadow-lg"
                    >
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
