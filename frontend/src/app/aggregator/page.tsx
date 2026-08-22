'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Search, Ticket, ArrowRight, Zap, Loader2, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface Event {
  id: string;
  name: string;
  date: string;
  hall?: { name: string, address: string };
  price: number;
  paymentType: string;
}

export default function AggregatorPortal() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/events/aggregator`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.log('Aggregator API error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.hall?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-blue-800 to-indigo-900 pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rotate-12"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[120%] rounded-full bg-gradient-to-l from-indigo-500/20 to-cyan-500/20 blur-3xl -rotate-12"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-sm font-medium mb-6 border border-white/20 backdrop-blur-md">
              <Globe size={16} /> Merkezi Keşif Portalı
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              Tüm Etkinlikler <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Tek Platformda</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              Farklı organizatörlerin düzenlediği en güncel etkinlikleri keşfedin ve hemen yerinizi ayırtın.
            </p>
            
            <div className="max-w-xl mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Etkinlik veya mekan ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 rounded-2xl border-0 ring-1 ring-white/20 bg-white/10 text-white placeholder:text-blue-200 focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition-all backdrop-blur-md text-lg"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-3xl shadow-xl shadow-slate-200/50">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-slate-500 font-medium text-lg">Etkinlikler yükleniyor...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/60 transition-all duration-300 border border-slate-100 group flex flex-col h-full"
              >
                <div className="p-6 flex-grow flex flex-col relative">
                  <div className="absolute top-4 right-4">
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-indigo-100 flex items-center gap-1 shadow-sm">
                      <Zap size={12} className="text-indigo-500" />
                      Aktif Satış
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-4 pr-24 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {event.name}
                  </h3>
                  
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100">
                        <Calendar size={16} className="text-blue-500" />
                      </div>
                      <span className="text-sm font-medium">
                        {new Date(event.date).toLocaleDateString('tr-TR', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-slate-600">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100">
                        <MapPin size={16} className="text-rose-500" />
                      </div>
                      <span className="text-sm font-medium line-clamp-1">{event.hall?.name || 'Belirtilmemiş'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Bilet Fiyatı</p>
                      <p className="text-2xl font-black text-slate-900">
                        {event.paymentType === 'free' ? 'Ücretsiz' : `${event.price} ₺`}
                      </p>
                    </div>
                    <Link
                      href={`/event/${event.id}`}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-md shadow-blue-600/20 active:scale-95"
                    >
                      Bilet Al <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ticket size={32} className="text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Sonuç Bulunamadı</h3>
            <p className="text-slate-500 max-w-md mx-auto">Arama kriterlerinize uygun etkinlik bulunmuyor. Lütfen farklı kelimelerle tekrar deneyin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
