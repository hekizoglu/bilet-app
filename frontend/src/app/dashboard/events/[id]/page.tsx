"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Users, Scan, Link as LinkIcon, Edit, ChevronLeft, Ticket, CheckCircle, Clock, Copy, Share2 } from 'lucide-react';

export default function EventDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchEventDetails = async () => {
    try {
      const token = getCookie('token');
      // 1. Fetch Event Info
      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEvent(eventData);
      }

      // 2. Fetch Attendees for this event
      const attRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${id}/attendees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        if (attData.success && attData.attendees) {
          setAttendees(attData.attendees);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-500 animate-pulse">
      Etkinlik detayları yükleniyor...
    </div>
  );

  if (!event) return (
    <div className="p-8 text-center text-red-500 font-bold">
      Etkinlik bulunamadı veya yetkiniz yok.
    </div>
  );

  // Stats calculation
  const totalTickets = attendees.length;
  const usedTickets = attendees.filter(a => a.isUsed).length;
  const totalRevenue = attendees.reduce((acc, curr) => acc + (event.price || 0), 0); // basic logic
  const eventUrl = `${window.location.origin}/event/${event.visibility === 'PRIVATE' ? event.privateSlug : event.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success('Etkinlik linki kopyalandı!');
  };

  const shareWhatsApp = () => {
    const text = `Seni etkinliğime davet ediyorum: ${event.name}\n\nKatılım durumu bildirmek için tıkla: ${eventUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => router.push('/dashboard/events')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 font-medium"
          >
            <ChevronLeft size={16} /> Etkinliklere Dön
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar size={16} /> 
            {new Date(event.date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition shadow-sm">
            <Copy size={16} /> Linki Kopyala
          </button>
          <button onClick={shareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl hover:bg-green-100 text-sm font-medium transition shadow-sm">
            <Share2 size={16} /> Paylaş
          </button>
          <button onClick={() => router.push('/dashboard/scanner')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold transition shadow-sm">
            <Scan size={18} /> Kapı Kontrolü
          </button>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Ticket size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Satılan / Kapasite</p>
            <p className="text-2xl font-black text-gray-900">{totalTickets} <span className="text-sm font-medium text-gray-400">/ {event.capacity}</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Giriş Yapan (Check-in)</p>
            <p className="text-2xl font-black text-green-700">{usedTickets} <span className="text-sm font-medium text-gray-400">/ {totalTickets}</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bekleyen (İçeri Girmeyen)</p>
            <p className="text-2xl font-black text-purple-700">{totalTickets - usedTickets}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center shrink-0">
            <span className="font-bold text-lg">₺</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tahmini Gelir</p>
            <p className="text-2xl font-black text-orange-700">{totalRevenue.toFixed(2)} ₺</p>
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Katılımcı Listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Müşteri</th>
                <th className="p-4 font-bold">Bilet Kodu</th>
                <th className="p-4 font-bold">Koltuk</th>
                <th className="p-4 font-bold">Durum</th>
                <th className="p-4 font-bold">Giriş (Check-in)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {attendees.map((att) => (
                <tr key={att.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-medium text-gray-900">
                    {att.customer}
                    <div className="text-xs text-gray-500 font-normal">{att.email}</div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs">{att.ticketCode}</td>
                  <td className="p-4 text-gray-600">
                    {att.seatName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-gray-200 bg-white">
                        {att.seatName}
                      </span>
                    ) : 'Genel Giriş'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      att.status === 'Onaylı' ? 'bg-green-100 text-green-700' :
                      att.status === 'Beklemede' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {att.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {att.isUsed ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs">
                        <CheckCircle size={14} /> İçeride
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 font-medium text-xs">
                        <Clock size={14} /> Bekliyor
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {attendees.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Henüz bilet alan / kayıt olan katılımcı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
