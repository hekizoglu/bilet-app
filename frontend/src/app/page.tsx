'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Tag, Search, ArrowRight, Sparkles, Ticket,
  Armchair, QrCode, PlusCircle, RefreshCw, Zap, Users, Info,
} from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import Countdown from '@/components/Countdown';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@/lib/api';

// ─────────────────────────────────────────────────────────────
// Tipler & Yardımcılar
// ─────────────────────────────────────────────────────────────

interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  date: string;
  price: number;
  isSeated: boolean;
  paymentType: string;
  visibility: string;
  status: string;
  hall?: {
    id: string;
    name: string;
    address?: string | null;
    seatCount?: number;
    calculatedSeatCount?: number;
  } | null;
  capacity: number;
  soldCount: number;
  availableCount: number;
}

interface PublicStats {
  upcomingEvents: number;
  freeEvents: number;
  availableSeats: number;
  eventsCreatedLast7Days: number;
  ticketsSold: number;
}

type FilterId = 'all' | 'week' | 'month' | 'free' | 'seated';

const FILTERS: { id: FilterId; name: string; emoji: string }[] = [
  { id: 'all', name: 'Tümü', emoji: '📋' },
  { id: 'week', name: 'Bu Hafta', emoji: '🗓️' },
  { id: 'month', name: 'Bu Ay', emoji: '📅' },
  { id: 'free', name: 'Ücretsiz', emoji: '🎁' },
  { id: 'seated', name: 'Koltuklu', emoji: '🪑' },
];

/** Etkinlik adından deterministik bir gradient üretir (kart görseli yerine) */
const GRADIENTS = [
  'from-indigo-500 via-blue-500 to-sky-400',
  'from-fuchsia-500 via-purple-500 to-indigo-400',
  'from-emerald-500 via-teal-500 to-cyan-400',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-rose-500 via-pink-500 to-fuchsia-400',
  'from-violet-500 via-purple-500 to-fuchsia-400',
  'from-sky-500 via-blue-500 to-indigo-400',
];
const gradientFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
};

/** İsimden baş harfler: "Ayşe'nin 30. Yaş Günü" → "A3" */
const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('tr-TR', { day: '2-digit' }),
    month: d.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('tr-TR', { weekday: 'long' }),
    time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

const isThisWeek = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + (7 - now.getDay() || 7));
  weekEnd.setHours(23, 59, 59);
  return d <= weekEnd;
};

const isThisMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

/** "Bugün", "Yarın", "3 gün sonra" gibi göreli gün etiketi */
const relativeDay = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startTarget - startToday) / 86400000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Yarın';
  if (diffDays > 1) return `${diffDays} gün sonra`;
  return '';
};

// Bileşenler
// ─────────────────────────────────────────────────────────────

function EventCard({ event, index }: { event: PublicEvent; index: number }) {
  const t = formatDate(event.date);
  const isFree = event.price <= 0;
  const hasCapacity = event.capacity > 0;
  const soldRatio = hasCapacity ? event.soldCount / event.capacity : 0;
  const isFull = hasCapacity && event.availableCount <= 0;
  const almostFull = hasCapacity && !isFull && soldRatio >= 0.8;
  const remaining = event.availableCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.5) }}
      className="h-full"
    >
      <Link
        href={`/event/${event.id}`}
        className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgb(37,99,235,0.15)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full"
      >
        {/* Üst bant: gradient + rozetler */}
        <div className={`relative h-40 bg-gradient-to-br ${gradientFor(event.name)} overflow-hidden`}>
          {/* Dekoratif desen */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_70%_20%,white,transparent_50%)]" />
          <span className="absolute inset-0 flex items-center justify-center text-white/25 font-black text-6xl tracking-wider select-none">
            {initials(event.name)}
          </span>

          {/* Tarih rozeti */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-xl px-3 py-2 text-center shadow-lg">
            <div className="text-lg font-black leading-none text-gray-900">{t.day}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-blue-600">{t.month}</div>
          </div>

          {/* Durum rozetleri */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            {isFull ? (
              <span className="bg-gray-900/90 backdrop-blur text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                DOLU
              </span>
            ) : almostFull ? (
              <span className="bg-red-500/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                SON {remaining} BİLET!
              </span>
            ) : isFree ? (
              <span className="bg-emerald-500/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                ÜCRETSİZ
              </span>
            ) : (
              <span className="bg-white/95 text-gray-900 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                {event.price.toLocaleString('tr-TR')} ₺
              </span>
            )}
          </div>
        </div>

        {/* Gövde */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">
              {relativeDay(event.date)}
            </span>
            <span className="capitalize">{t.weekday}</span>
            <span>•</span>
            <span>{t.time}</span>
            {event.isSeated && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-indigo-500 font-semibold">
                  <Armchair size={12} /> Koltuklu
                </span>
              </>
            )}
          </div>

          <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
            {event.name}
          </h3>

          {event.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>
          )}

          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4 mt-auto pt-1">
            {event.isSeated && event.hall ? (
              <>
                <MapPin size={14} className="text-blue-500 shrink-0" />
                <span className="truncate">{event.hall.name}</span>
              </>
            ) : (
              <>
                <Tag size={14} className="text-blue-500 shrink-0" />
                <span>Genel Giriş</span>
              </>
            )}
          </div>

          {/* Kalan bilet çubuğu */}
          {hasCapacity && (
            <div className="mb-4">
              <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                <span className={isFull ? 'text-gray-400' : almostFull ? 'text-red-500' : 'text-gray-500'}>
                  {isFull ? 'Tükendi' : `${remaining} bilet kaldı`}
                </span>
                <span className="text-gray-400">{event.soldCount}/{event.capacity} satıldı</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isFull ? 'bg-gray-300' : almostFull ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, soldRatio * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Alt satır */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Bilet</div>
              <div className="font-black text-gray-900">
                {isFree ? <span className="text-emerald-600">Ücretsiz</span> : `${event.price.toLocaleString('tr-TR')} ₺`}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isFull
                ? 'bg-gray-100 text-gray-400'
                : 'bg-blue-600 text-white group-hover:bg-blue-700 group-hover:shadow-lg group-hover:shadow-blue-500/25'
            }`}>
              {isFull ? 'Bekleme Listesi' : 'Bilet Al'}
              {!isFull && <ArrowRight size={15} />}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero: Öne Çıkan Etkinlik Kartı (slayt öğesi)
// ─────────────────────────────────────────────────────────────

function HeroFeatured({ event }: { event: PublicEvent }) {
  const t = formatDate(event.date);
  return (
    <div className={`relative bg-gradient-to-br ${gradientFor(event.name)} rounded-3xl p-8 shadow-2xl shadow-black/40 overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_10%,white,transparent_55%)]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold">
            <Zap size={12} /> Öne Çıkan
          </span>
          <span className="bg-white/95 text-gray-900 text-sm font-black px-3 py-1.5 rounded-xl">
            {event.price > 0 ? `${event.price.toLocaleString('tr-TR')} ₺` : 'ÜCRETSİZ'}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-5xl font-black leading-none">{t.day}</div>
            <div className="text-sm font-bold uppercase tracking-widest text-white/80 mt-1">
              {t.month} • {t.weekday}
            </div>
          </div>
          <div className="text-right text-xs font-semibold text-white/70">
            Başlamasına kalan
            <div className="mt-1.5">
              <Countdown target={event.date} dark />
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-black leading-snug mb-3">{event.name}</h3>
        <p className="text-white/80 text-sm leading-relaxed mb-8 line-clamp-3">
          {event.description || 'Detaylar için tıklayın.'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/85">
            {event.isSeated && event.hall ? (
              <>
                <MapPin size={15} /> {event.hall.name}
              </>
            ) : (
              <>
                <Tag size={15} /> Genel Giriş
              </>
            )}
          </div>
          <Link
            href={`/event/${event.id}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition shadow-lg"
          >
            Bilet Al <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ana Sayfa
// ─────────────────────────────────────────────────────────────

export default function Home() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [platformStats, setPlatformStats] = useState<PublicStats | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<PublicEvent[]>('/events/public');
      setEvents(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Etkinlikler yüklenemedi.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<PublicStats>('/events/stats');
      setPlatformStats(data);
    } catch {
      // İstatistikler yüklenemezse sessizce geç — sayfa ana akışı etkilenmez
    }
  }, []);

  useEffect(() => {
    // async veri çekme + cookie okuma (mount anında) — set-state-in-effect yanlış pozitifi bilinçli olarak kapsam dışı
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    fetchStats();
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);
  }, [fetchEvents, fetchStats]);

  // Hero slaytı: öne çıkan ilk 5 etkinlik arasında otomatik dön
  const featuredEvents = useMemo(() => events.slice(0, 5), [events]);
  const safeFeaturedIndex = featuredEvents.length > 0 ? featuredIndex % featuredEvents.length : 0;

  useEffect(() => {
    if (sliderPaused || featuredEvents.length <= 1) return;
    const t = setInterval(() => setFeaturedIndex(i => (i + 1) % featuredEvents.length), 6000);
    return () => clearInterval(t);
  }, [sliderPaused, featuredEvents.length]);

  // Arama + filtre
  const filteredEvents = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return events.filter((e) => {
      if (filter === 'week' && !isThisWeek(e.date)) return false;
      if (filter === 'month' && !isThisMonth(e.date)) return false;
      if (filter === 'free' && e.price > 0) return false;
      if (filter === 'seated' && !e.isSeated) return false;
      if (q) {
        const haystack = `${e.name} ${e.description || ''} ${e.hall?.name || ''}`.toLocaleLowerCase('tr-TR');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, filter, query]);

  // İstatistikler (client-side)
  const stats = useMemo(() => {
    const free = events.filter(e => e.price <= 0).length;
    const seated = events.filter(e => e.isSeated).length;
    const totalCapacity = events.reduce((s, e) => s + (e.capacity || 0), 0);
    const available = events.reduce((s, e) => s + (e.availableCount || 0), 0);
    return { total: events.length, free, seated, totalCapacity, available };
  }, [events]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white">
        {/* Dekoratif arka plan */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -bottom-48 -left-32 h-[400px] w-[400px] rounded-full bg-fuchsia-600/15 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Sol: metin + arama */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles size={13} /> Premium Etkinlik Biletleme Platformu
              </span>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] mb-6">
                Etkinlikleri Keşfet,<br />
                <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  Koltuğunu Anında Kap
                </span>
              </h1>

              <p className="text-lg text-indigo-100/80 max-w-xl leading-relaxed mb-8">
                Konserler, düğünler, partiler ve özel davetler… Haritadan koltuğunu seç,
                QR biletin cebinde olsun. Saniyeler içinde biletini al.
              </p>

              {/* Arama kutusu */}
              <form
                onSubmit={(e) => { e.preventDefault(); document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="relative max-w-xl mb-6"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Etkinlik, mekân veya açıklama ara..."
                  className="w-full pl-12 pr-32 py-4 rounded-2xl bg-white text-gray-900 placeholder-gray-400 shadow-2xl shadow-indigo-950/50 outline-none ring-0 focus:ring-4 focus:ring-blue-500/40 transition text-base"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition flex items-center gap-2"
                >
                  Ara <ArrowRight size={15} />
                </button>
              </form>

              {/* CTA'lar */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#events-section"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                  <Ticket size={18} /> Bilet Al
                </a>
                {!isLoggedIn ? (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-bold transition-all"
                  >
                    <Users size={18} /> Giriş Yap
                  </Link>
                ) : null}
                <Link
                  href="/event/create"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10 font-bold transition-all"
                >
                  <PlusCircle size={18} /> Etkinlik Oluştur
                </Link>
              </div>

              {/* Mini istatistikler */}
              {!loading && events.length > 0 && (
                <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-white/10">
                  <div>
                    <div className="text-2xl font-black">{stats.total}</div>
                    <div className="text-xs text-indigo-200/70 font-medium">Yaklaşan Etkinlik</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-400">{stats.free}</div>
                    <div className="text-xs text-indigo-200/70 font-medium">Ücretsiz</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{stats.available.toLocaleString('tr-TR')}</div>
                    <div className="text-xs text-indigo-200/70 font-medium">Açık Koltuk / Kontenjan</div>
                  </div>
                </div>
              )}
            </div>

            {/* Sağ: öne çıkan etkinlik slaytı (gerçek veri, otomatik döner) */}
            <div className="relative hidden lg:block">
              {featuredEvents.length > 0 ? (
                <div
                  className="relative"
                  onMouseEnter={() => setSliderPaused(true)}
                  onMouseLeave={() => setSliderPaused(false)}
                >
                  {/* Arka plan kartı (dekor) */}
                  <div className="absolute inset-0 translate-x-4 translate-y-4 bg-white/5 border border-white/10 rounded-3xl" />

                  {/* Slayt geçişleri */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={featuredEvents[safeFeaturedIndex].id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                      <HeroFeatured event={featuredEvents[safeFeaturedIndex]} />
                    </motion.div>
                  </AnimatePresence>

                  {/* Slayt noktaları */}
                  {featuredEvents.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-5">
                      {featuredEvents.map((ev, i) => (
                        <button
                          key={ev.id}
                          onClick={() => setFeaturedIndex(i)}
                          aria-label={`${ev.name} etkinliğini göster`}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === safeFeaturedIndex
                              ? 'w-8 bg-white'
                              : 'w-2 bg-white/30 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Floating rozetler */}
                  <div className="absolute -top-5 -right-3 bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-2xl shadow-xl rotate-6">
                    ✓ Anında QR Bilet
                  </div>
                  <div className="absolute -bottom-5 -left-4 bg-white text-gray-800 text-xs font-black px-4 py-2 rounded-2xl shadow-xl -rotate-3 flex items-center gap-1.5">
                    <QrCode size={14} className="text-indigo-600" /> Kapıda QR ile giriş
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-10 text-center">
                  <Ticket size={48} className="mx-auto mb-4 text-indigo-300/60" />
                  <h3 className="text-xl font-bold mb-2">İlk etkinliğini oluştur</h3>
                  <p className="text-indigo-100/70 text-sm mb-6">
                    Salon tasarla, fiyatını belirle, linkini paylaş. QR biletler otomatik!
                  </p>
                  <Link
                    href="/event/create"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition"
                  >
                    <PlusCircle size={16} /> Hemen Oluştur
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ NASIL ÇALIŞIR ══════════════ */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                Icon: Search,
                title: '1. Keşfet',
                desc: 'Etkinlikleri ara, filtrele; fiyatı, kalan koltuğu ve mekânı tek bakışta gör.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                Icon: Armchair,
                title: '2. Koltuğu Seç',
                desc: 'Salon haritasından koltuğunu işaretle, bilgilerini gir, saniyeler içinde tamamla.',
                color: 'bg-indigo-50 text-indigo-600',
              },
              {
                Icon: QrCode,
                title: '3. QR ile Gir',
                desc: 'E-biletin e-postanda. Kapıda QR okut, anında içeri gir — kâğıt bilet yok.',
                color: 'bg-emerald-50 text-emerald-600',
              },
            ].map(({ Icon, title, desc, color }) => (
              <div key={title} className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ETKİNLİKLER ══════════════ */}
      <main id="events-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Calendar className="text-indigo-600" size={30} />
              Yaklaşan Etkinlikler
            </h2>
            <p className="text-gray-500 mt-1">
              {loading ? 'Yükleniyor...' : `${filteredEvents.length} etkinlik gösteriliyor`}
            </p>
          </div>

          {/* Filtre çipleri */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  filter === f.id
                    ? 'bg-gray-900 text-white shadow-md scale-105'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{f.emoji}</span>
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* İçerik durumları */}
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
              <Search className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {query ? `"${query}" için sonuç yok` : 'Bu filtrede etkinlik yok'}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {query
                ? 'Farklı bir arama yapmayı veya filtreyi sıfırlamayı deneyin.'
                : 'Yakında yeni etkinlikler eklenecek. Filtreyi değiştirerek diğer etkinliklere göz atabilirsiniz.'}
            </p>
            {(query || filter !== 'all') && (
              <button
                onClick={() => { setQuery(''); setFilter('all'); }}
                className="mt-6 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </main>

      {/* ══════════════ ORGANİZATÖR CTA ══════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white px-8 py-12 sm:px-14 sm:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="absolute -bottom-20 -right-10 opacity-10">
            <Ticket size={260} />
          </div>

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={13} /> Organizatörler için
              </span>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
                Kendi etkinliğini 5 dakikada oluştur
              </h2>
              <p className="text-blue-50/90 leading-relaxed mb-8 max-w-lg">
                Salonunu tasarla, fiyatını belirle, davet linkini paylaş. Satışlar canlı takip
                edilsin, kapıda QR check-in ile her şey otomatik işlesin.
              </p>

              {/* Sosyal kanıt — canlı istatistikler */}
              {platformStats && (
                <div className="flex flex-wrap gap-x-8 gap-y-3 mb-8">
                  <div>
                    <div className="text-2xl font-black">{platformStats.eventsCreatedLast7Days}</div>
                    <div className="text-xs text-blue-100/70 font-medium">Son 7 günde oluşturulan etkinlik</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{platformStats.ticketsSold.toLocaleString('tr-TR')}</div>
                    <div className="text-xs text-blue-100/70 font-medium">Bugüne kadar satılan bilet</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{platformStats.availableSeats.toLocaleString('tr-TR')}</div>
                    <div className="text-xs text-blue-100/70 font-medium">Açık koltuk / kontenjan</div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/event/create"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-blue-700 font-black hover:bg-blue-50 transition-all hover:-translate-y-0.5 shadow-xl"
                >
                  <PlusCircle size={18} /> Etkinlik Oluştur
                </Link>
                <Link
                  href="/nasil-calisir"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 font-bold transition-all"
                >
                  Nasıl Çalışır? <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: Armchair, title: 'Salon Tasarımcısı', desc: 'Sürükle-bırak ile masa ve koltuk planı' },
                { Icon: Zap, title: 'Canlı Satış Paneli', desc: 'Anlık satış, kalan koltuk, ciro takibi' },
                { Icon: QrCode, title: 'QR Check-in', desc: 'Kapıda saniyede okut, çift girişi engelle' },
                { Icon: Ticket, title: 'Kupon & Puan', desc: 'İndirim kuponu ve sadakat puanı ver' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-colors">
                  <Icon size={22} className="mb-3 text-sky-200" />
                  <h3 className="font-bold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-blue-100/80 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <Ticket size={18} />
            </span>
            <span className="font-black text-gray-900">Bilet Sistemi</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link href="/nasil-calisir" className="hover:text-blue-600 transition font-medium">Nasıl Çalışır?</Link>
            <Link href="/aggregator" className="hover:text-blue-600 transition font-medium">Keşif Portalı</Link>
            <Link href="/gizlilik-politikasi" className="hover:text-blue-600 transition font-medium">Gizlilik Politikası</Link>
            <Link href="/event/create" className="hover:text-blue-600 transition font-medium">Etkinlik Oluştur</Link>
          </nav>
          <div className="text-xs text-gray-400">© {new Date().getFullYear()} Bilet Sistemi</div>
        </div>
      </footer>
    </div>
  );
}
