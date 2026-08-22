"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { apiFetch, API_ORIGIN } from '@/lib/api';
import Countdown from '@/components/Countdown';

// Konva hydration hatalarını önlemek için client-side import yapıyoruz
const DynamicSeatMapViewer = dynamic(() => import('@/components/SeatMapViewer'), { ssr: false });

export default function CustomerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    seatId: '',
    seatName: '',
    couponCode: '',
    usePoints: false
  });
  
  const [rsvpData, setRsvpData] = useState({
    status: 'ATTENDING',
    guestCount: 0,
    childCount: 0,
    notes: ''
  });
  const [userPoints, setUserPoints] = useState<number>(0);
  const [discount, setDiscount] = useState<{type: string, value: number} | null>(null);
  const [selectionMode, setSelectionMode] = useState<'list' | 'map'>('list');
  const [socketInstance, setSocketInstance] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [reservationSuccess, setReservationSuccess] = useState<any>(null);
  const [adminPaymentInfo, setAdminPaymentInfo] = useState<any>(null);

  const handleSeatToggle = (seat: any) => {
    // Backend tek rezervasyonda tek koltuk destekler: çoklu seçim yerine tek seçim yapılır
    const isAlreadySelected = selectedSeats.some((s: any) => s.id === seat.id);
    let newSelected: any[];
    if (isAlreadySelected) {
      newSelected = [];
      toast.info(`Koltuk ${seat.name} seçimi kaldırıldı.`);
    } else {
      newSelected = [seat];
      toast.success(`Koltuk ${seat.name} seçildi.`);
    }
    setSelectedSeats(newSelected);
    const names = newSelected.map(s => s.name).join(', ');
    const lastId = newSelected.length > 0 ? newSelected[newSelected.length - 1].id : '';
    setForm(prev => ({ ...prev, seatId: lastId, seatName: names }));
  };

  useEffect(() => {
    let cancelled = false;

    // 1. Veriyi Getir
    apiFetch(`/reservations/availability/${id}`)
      .then((d: any) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
        if (d && d.paymentType === 'cardless') {
          apiFetch('/users/admin-payment-info')
            .then((p: any) => { if (!cancelled && p) setAdminPaymentInfo(p); })
            .catch(console.error);
        }
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        setData({ error: err instanceof Error ? err.message : 'Etkinlik verisi yüklenemedi.' });
        setLoading(false);
      });

    // Get user points if logged in
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (token) {
      apiFetch('/users/me')
        .then((u: any) => {
           if (cancelled || !u) return;
           if (u.points) setUserPoints(u.points);
           if (u.email) setForm(prev => ({...prev, email: u.email}));
           if (u.name) setForm(prev => ({...prev, name: u.name}));
        })
        .catch(console.error);
    }

    let socket: any;

    if (data?.eventId) {
      // 2. Gerçek Zamanlı Socket Bağlantısı
      socket = io(API_ORIGIN);
      socket.emit('join_event', data.eventId);

      socket.on('seat_booked', (payload: { seatId: string }) => {
        // Bir başkası koltuk aldı, listeden anında sil
        setData((prev: any) => {
          if (!prev || !prev.isSeated) return prev;
          return {
            ...prev,
            availableSeats: prev.availableSeats.filter((s: any) => s.id !== payload.seatId)
          };
        });
        setLockedSeats(prev => prev.filter(id => id !== payload.seatId));
      });
      
      socket.on('seat_locked', (payload: { seatId: string }) => {
        setLockedSeats(prev => [...prev, payload.seatId]);
        // Seçili koltuk başkası tarafından kilitlendiyse seçimi temizle
        setSelectedSeats(prev => {
          if (prev.some(s => s.id === payload.seatId)) {
            toast.warning(`${payload.seatId} az önce başka bir müşteri tarafından seçildi.`);
            setForm(f => ({ ...f, seatId: '', seatName: '' }));
            return [];
          }
          return prev;
        });
      });

      socket.on('seat_released', (payload: { seatId: string }) => {
        setLockedSeats(prev => prev.filter(id => id !== payload.seatId));
      });
      
      // Save socket instance to state for checkout
      setSocketInstance(socket);
    }

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
    };
  }, [id, data?.eventId]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (data.isSeated && !form.seatId && data.paymentType !== 'free') {
      toast.error("Lütfen bir koltuk seçin.");
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (data.paymentType === 'free') {
        const payload: any = {
          eventId: data.eventId,
          customer: form.name,
          email: form.email,
          phone: form.phone,
          rsvpStatus: rsvpData.status,
          guestCount: rsvpData.guestCount,
          childCount: rsvpData.childCount,
          notes: rsvpData.notes
        };
        try {
          const result = await apiFetch('/reservations/rsvp', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          setReservationSuccess(result.reservation);
        } catch (err: any) {
          if (err?.data?.requiresWaitlist) {
            toast.error(err.message);
          } else {
            toast.error(`Hata: ${err?.message || 'Bilinmeyen hata'}`);
          }
        }
      } else {
        const payload: any = {
          eventIdOrSlug: id,
          customer: form.name,
          email: form.email,
          phone: form.phone,
          couponCode: form.couponCode || undefined,
          usePoints: form.usePoints,
          socketId: socketInstance ? socketInstance.id : undefined
        };
        if (data.isSeated) {
          payload.seatId = form.seatId;
        }
        try {
          const result = await apiFetch('/reservations', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (data.paymentType && data.paymentType !== 'free') {
            router.push(`/payment/mobile?id=${result.reservation.id}`);
          } else {
            setReservationSuccess(result.reservation);
          }
        } catch (err: any) {
          toast.error(`Hata: ${err?.message || 'Bilinmeyen hata'}`);
        }
      }
    }catch {
      toast.error("Bağlantı hatası");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch(`/events/${id}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.name,
          email: form.email,
          phone: form.phone
        })
      });
      toast.success("Bekleme listesine başarıyla eklendiniz! Bilet iptali olursa anında haber vereceğiz.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error(`Hata: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans animate-pulse">
      <div className="mb-6">
        <div className="h-10 bg-gray-200 rounded-lg w-1/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded-full w-48"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-100 p-6 rounded-2xl h-80 border border-gray-200"></div>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl h-[400px] border border-gray-200"></div>
      </div>
    </div>
  );

  if (data.error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-gray-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bilet Bulunamadı</h2>
        <p className="text-gray-500 mb-6">{data.error}</p>
        <button onClick={() => router.push('/')} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-gray-800 transition w-full">
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );

  if (reservationSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-green-50 text-green-800 p-8 rounded-2xl border border-green-100 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">Rezervasyon Başarılı!</h1>
          <p className="text-lg mb-6">Bilet talebiniz alınmıştır.</p>
          
          {(reservationSuccess.mailSent === 'queued' || reservationSuccess.mailSent === false) && data.paymentType !== 'free' && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-sm mb-6 text-left">
              <strong>🔔 Bilgilendirme:</strong> Biletiniz başarıyla sistemimize kaydedildi. E-posta sistemindeki yoğunluk nedeniyle e-bilet gönderiminiz arka planda işlenmektedir (Lütfen daha sonra Spam klasörünüzü de kontrol edin). Biletinize anında <strong>"Biletlerim"</strong> sekmesinden ulaşabilirsiniz.
            </div>
          )}

          {data.paymentType === 'free' && reservationSuccess.rsvpStatus === 'ATTENDING' && data.address && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 text-left shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">📍 Etkinlik Adresi</h2>
              <p className="text-gray-700 whitespace-pre-line">{data.address}</p>
            </div>
          )}

          {data.paymentType === 'cardless' && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 text-left space-y-4">
              <h2 className="text-xl font-bold text-blue-800">Ödeme Bekleniyor (Kartsız Ödeme)</h2>
              <p className="text-gray-700">Lütfen banka transferi (EFT/Havale) yaparak veya Telegram üzerinden bizimle iletişime geçerek ödemenizi tamamlayın.</p>
              
              {adminPaymentInfo && (
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 space-y-2 text-sm text-gray-800">
                  <div className="font-bold text-blue-900 mb-2">🏦 Ödeme Alıcı Bilgileri</div>
                  {adminPaymentInfo.iban ? (
                    <>
                      <div>Hesap Sahibi: <strong>{adminPaymentInfo.email}</strong></div>
                      <div>IBAN: <strong className="font-mono text-blue-700 select-all">{adminPaymentInfo.iban}</strong></div>
                    </>
                  ) : (
                    <div className="text-gray-500 italic">Banka bilgisi girilmemiştir.</div>
                  )}
                  {adminPaymentInfo.telegramUsername && (
                    <div className="pt-2 border-t border-blue-200 mt-2">
                      ✈️ Telegram Destek: <a href={`https://t.me/${adminPaymentInfo.telegramUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">@{adminPaymentInfo.telegramUsername.replace('@', '')}</a>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Referans Numaranız (Transfer açıklamasına MUTLAKA yazınız):</p>
                <p className="text-xl font-mono font-bold text-gray-900">{reservationSuccess.paymentReference}</p>
              </div>
            </div>
          )}
          {data.paymentType === 'creditcard' && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 text-left">
              <h2 className="text-xl font-bold mb-4 text-blue-800">Ödeme Yapılmalı</h2>
              <p className="text-gray-700">Şu anda kredi kartı entegrasyonu simülasyon aşamasındadır. Yöneticileriniz size ulaşacaktır.</p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            {data.paymentType === 'cardless' && (
              <a 
                href={`/payment/mobile?id=${reservationSuccess.id}`}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition inline-block text-sm"
              >
                📲 Kolay Mobil Ödeme Sayfası
              </a>
            )}
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition text-sm">
              Yeni Bilet Al
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Koltukları Y-koordinatına göre 15px toleransla satırlara grupla ve sırala
  const getGroupedSeats = (seats: any[]) => {
    if (!seats || seats.length === 0) return [];
    const tolerance = 15;
    const rows: { y: number; seats: any[] }[] = [];
    
    seats.forEach(seat => {
      const existingRow = rows.find(r => Math.abs(r.y - seat.y) <= tolerance);
      if (existingRow) {
        existingRow.seats.push(seat);
      } else {
        rows.push({ y: seat.y, seats: [seat] });
      }
    });
    
    rows.sort((a, b) => a.y - b.y);
    rows.forEach(r => {
      r.seats.sort((a, b) => a.x - b.x);
    });
    return rows;
  };

  const groupedSeats = data.isSeated ? getGroupedSeats(data.availableSeats) : [];

  // Kapasite doluluk oranı (animasyonlu çubuk için)
  const totalCap = data.isSeated ? data.totalCapacity : data.capacity;
  const availableCount = data.isSeated ? data.availableSeats?.length : data.available;
  const soldCount = Math.max(0, (totalCap || 0) - (availableCount || 0));
  const soldRatio = totalCap > 0 ? soldCount / totalCap : 0;
  const almostFull = totalCap > 0 && availableCount > 0 && soldRatio >= 0.8;
  const isFull = totalCap > 0 && availableCount <= 0;

  const eventDate = data.eventDate;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
          {data.isSeated ? data.hallName : "Genel Giriş Etkinliği"}
        </h1>

        {/* Rozetler */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {data.paymentType === 'cardless' && (
            <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Bu etkinlik Kartsız Ödeme ile çalışmaktadır.
            </span>
          )}
          {data.paymentType === 'creditcard' && (
            <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Bu etkinlik Kredi Kartı ile çalışmaktadır.
            </span>
          )}
          {data.paymentType === 'free' && (
            <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              Ücretsiz Etkinlik
            </span>
          )}
        </div>

        {/* Geri sayım + kapasite (tarih bilgisi varsa) */}
        {eventDate && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Etkinlik Başlamasına Kalan
              </p>
              <Countdown target={eventDate} />
            </div>

            {totalCap > 0 && (
              <div className="sm:w-64">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={isFull ? 'text-gray-400' : almostFull ? 'text-red-500' : 'text-gray-500'}>
                    {isFull ? 'Tükendi' : `${availableCount} bilet kaldı`}
                  </span>
                  <span className="text-gray-400">{soldCount}/{totalCap} satıldı</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      isFull ? 'bg-gray-300' : almostFull ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, soldRatio * 100))}%` }}
                  />
                </div>
                {almostFull && !isFull && (
                  <p className="text-[11px] font-bold text-red-500 mt-1.5 animate-pulse">
                    ⚡ Az kaldı — biletler hızla tükeniyor!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sol Sütun: Koltuk Seçimi / Kapasite */}
        <div className="lg:col-span-2 space-y-6">
          {!data.isSeated && (
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Kalan Bilet Sayısı</p>
                <p className="text-3xl font-black text-blue-900 mt-1">{data.available} / {data.capacity}</p>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-lg">
                Genel Giriş
              </span>
            </div>
          )}

          {data.isSeated && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <p className="text-lg font-bold text-gray-800">Boş Koltuk Seçimi ({data.availableSeats.length} adet)</p>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                  <button 
                    onClick={() => setSelectionMode('list')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectionMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Sıralı Seçim
                  </button>
                  <button 
                    onClick={() => setSelectionMode('map')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition ${selectionMode === 'map' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Görselden Seçim
                  </button>
                </div>
              </div>
              
              {selectionMode === 'map' ? (
                <div className="bg-white rounded-xl overflow-x-auto touch-pan-x touch-pan-y border border-gray-200 mb-4">
                  {data.hallLayout ? (
                    <DynamicSeatMapViewer 
                      layoutJson={data.hallLayout}
                      availableSeats={data.availableSeats}
                      selectedSeatId={form.seatId}
                      selectedSeatIds={selectedSeats.map((s: any) => s.id)}
                      onSeatSelect={(id) => {
                        const seat = data.availableSeats.find((s: any) => s.id === id);
                        if (seat) {
                          handleSeatToggle(seat);
                        }
                      }}
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      Görsel harita verisi bulunamadı. Lütfen Sıralı Seçim kullanın.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedSeats.length > 0 ? (
                    groupedSeats.map((row, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[70px] mt-2 sm:mt-0">
                          Sıra {index + 1}:
                        </span>
                        <div className="flex flex-wrap gap-2 py-1">
                          {row.seats.map((seat: any) => {
                            const isLocked = lockedSeats.includes(seat.id);
                            const isSelected = selectedSeats.some((s: any) => s.id === seat.id);
                            return (
                              <button 
                                key={seat.id}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleSeatToggle(seat)}
                                className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                                  isLocked 
                                    ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-70' 
                                    : isSelected 
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20 active:scale-95' 
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 active:scale-95'
                                }`}
                                title={isLocked ? "Şu an başka bir müşteri tarafından işlem yapılıyor" : ""}
                              >
                                {seat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Boş koltuk kalmadı.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sağ Sütun: Form */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 relative overflow-hidden lg:sticky lg:top-6">
          {(data.isSeated ? data.availableSeats?.length === 0 : data.available === 0) ? (
            <>
              <h2 className="text-xl font-bold text-gray-900">Etkinlik Dolu 🎫</h2>
              <p className="text-sm text-gray-500">Tüm biletler tükenmiştir. İptal olan biletlerden anında haberdar olmak için bekleme listesine katılabilirsiniz. Bilet açıldığı an e-posta alacaksınız.</p>
              
              <form onSubmit={handleWaitlist} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Ad Soyad</label>
                  <input required type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" 
                         onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">E-Posta</label>
                  <input required type="email" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                         onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Telefon</label>
                  <input type="tel" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                         placeholder="05xxxxxxxxx (İsteğe bağlı)"
                         onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/10 cursor-pointer'}`}
                >
                  {isSubmitting ? 'İşleniyor...' : 'Bekleme Listesine Katıl'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900">Müşteri Bilgileri</h2>
          
          {form.seatName && (
            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-sm font-semibold border border-blue-100 flex items-center justify-between mb-4">
              <span>Seçilen Koltuklar ({selectedSeats.length}): <strong className="underline font-mono">{form.seatName}</strong></span>
              {selectedSeats.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => { setSelectedSeats([]); setForm(prev => ({...prev, seatId: '', seatName: ''})); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold ml-2"
                >
                  Temizle
                </button>
              )}
            </div>
          )}

          <form id="reservation-checkout-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Ad Soyad</label>
              <input required type="text" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" 
                     value={form.name}
                     onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">E-Posta</label>
              <input required type="email" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                     value={form.email}
                     onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Telefon</label>
              <input type="tel" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                     placeholder="05xxxxxxxxx (İsteğe bağlı)"
                     value={form.phone}
                     onChange={e => setForm({...form, phone: e.target.value})} />
            </div>

            {/* RSVP Alanları */}
            {data.paymentType === 'free' ? (
              <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Katılım Durumunuz</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setRsvpData({...rsvpData, status: 'ATTENDING'})} className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${rsvpData.status === 'ATTENDING' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Katılıyorum</button>
                    <button type="button" onClick={() => setRsvpData({...rsvpData, status: 'NOT_ATTENDING'})} className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${rsvpData.status === 'NOT_ATTENDING' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Katılamıyorum</button>
                    <button type="button" onClick={() => setRsvpData({...rsvpData, status: 'MAYBE'})} className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${rsvpData.status === 'MAYBE' ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Kararsızım</button>
                  </div>
                </div>

                {rsvpData.status === 'ATTENDING' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    {!data.isSeated && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 min-h-[32px] flex items-end">Ek Yetişkin</label>
                        <input type="number" min="0" max="10" className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                               value={rsvpData.guestCount}
                               onChange={e => setRsvpData({...rsvpData, guestCount: parseInt(e.target.value) || 0})} />
                      </div>
                    )}
                    <div className={data.isSeated ? "col-span-2" : ""}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 min-h-[32px] flex items-end">Yanınızdaki Çocuk Sayısı</label>
                      <input type="number" min="0" max="10" className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                             value={rsvpData.childCount}
                             onChange={e => setRsvpData({...rsvpData, childCount: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Notunuz (İsteğe bağlı)</label>
                  <textarea className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none" rows={2}
                            placeholder="Örn: Yemekte alerjim var..."
                            value={rsvpData.notes}
                            onChange={e => setRsvpData({...rsvpData, notes: e.target.value})}></textarea>
                </div>
              </div>
            ) : (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">İndirim Kuponu</label>
              <div className="flex gap-2 items-center mb-3">
                <input type="text" className="flex-1 min-w-0 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm uppercase"
                       placeholder="KOD"
                       value={form.couponCode}
                       onChange={e => setForm({...form, couponCode: e.target.value.toUpperCase()})} />
                    <button type="button" 
                            onClick={async () => {
                              if (!form.couponCode) return;
                              try {
                                const result = await apiFetch('/coupons/validate', {
                                  method: 'POST',
                                  body: JSON.stringify({ code: form.couponCode })
                                });
                                setDiscount({ type: result.discountType, value: result.discountValue });
                                toast.success("Kupon başarıyla uygulandı!");
                              } catch (err: any) {
                                toast.error(err?.message || 'Geçersiz kupon kodu.');
                                setDiscount(null);
                                setForm(f => ({ ...f, couponCode: '' }));
                              }
                            }}
                        className="shrink-0 h-[46px] bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl font-bold text-sm transition flex items-center justify-center cursor-pointer active:scale-95 shadow-sm">Uygula</button>
              </div>

              {userPoints > 0 && data.price > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="usePoints" 
                    checked={form.usePoints}
                    onChange={(e) => setForm({...form, usePoints: e.target.checked})}
                    className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="usePoints" className="text-sm font-semibold text-yellow-800 cursor-pointer">
                    Sadakat Puanlarımı Kullan ({userPoints.toFixed(2)} ₺ indirim)
                  </label>
                </div>
              )}

              <div className="flex justify-between items-center text-sm mb-1 text-gray-600">
                <span>Bilet Fiyatı {selectedSeats.length > 1 ? `(${selectedSeats.length} Koltuk)` : ''}:</span>
                <span className="font-semibold">{(data.price * Math.max(1, selectedSeats.length)).toFixed(2)} ₺</span>
              </div>
              
              {discount && (
                <div className="flex justify-between items-center text-sm text-green-600 mb-1">
                  <span>Kupon İndirimi:</span>
                  <span>-{discount.type === 'PERCENTAGE' ? ((data.price * Math.max(1, selectedSeats.length)) * discount.value / 100).toFixed(2) : discount.value.toFixed(2)} ₺</span>
                </div>
              )}

              {form.usePoints && (
                <div className="flex justify-between items-center text-sm text-yellow-600 mb-1">
                  <span>Kullanılan Puan:</span>
                  <span>-{Math.min(userPoints, Math.max(0, (data.price * Math.max(1, selectedSeats.length)) - (discount ? (discount.type === 'PERCENTAGE' ? ((data.price * Math.max(1, selectedSeats.length)) * discount.value / 100) : discount.value) : 0))).toFixed(2)} ₺</span>
                </div>
              )}

              <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-3 pt-3 border-t border-gray-100">
                <span>Toplam Ödenecek:</span>
                <span className="text-blue-700">
                  {(() => {
                    let baseTotal = data.price * Math.max(1, selectedSeats.length);
                    if (discount) {
                      const discAmount = discount.type === 'PERCENTAGE' ? (baseTotal * discount.value / 100) : discount.value;
                      baseTotal = Math.max(0, baseTotal - discAmount);
                    }
                    if (form.usePoints) {
                      baseTotal = Math.max(0, baseTotal - userPoints);
                    }
                    return baseTotal.toFixed(2);
                  })()} ₺
                </span>
              </div>
            </div>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-500/10 cursor-pointer'}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  İşleniyor...
                </>
              ) : (
                data.paymentType === 'free' ? 'Katılım Durumunu Bildir' : 'Rezervasyonu Tamamla'
              )}
            </button>
          </form>
          </>
          )}
        </div>
      </div>

      {/* UX-SEAT-002: Mobil Sabit Özet Barı (Sticky Checkout Bar) */}
      {selectedSeats.length > 0 && (
        <div 
          aria-label="Seçilen Koltuk Özeti" 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl z-40 flex items-center justify-between md:hidden"
        >
          <div>
            <div className="text-xs text-gray-500 font-medium">
              Seçilen: <span className="font-bold text-gray-800">{selectedSeats.length} Koltuk</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {(() => {
                let baseTotal = data.price * Math.max(1, selectedSeats.length);
                if (discount) {
                  const discAmount = discount.type === 'PERCENTAGE' ? (baseTotal * discount.value / 100) : discount.value;
                  baseTotal = Math.max(0, baseTotal - discAmount);
                }
                if (form.usePoints) {
                  baseTotal = Math.max(0, baseTotal - userPoints);
                }
                return baseTotal.toFixed(2);
              })()} ₺
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const formEl = document.getElementById('reservation-checkout-form');
              if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-md text-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          >
            Ödemeye Geç
          </button>
        </div>
      )}
    </div>
  );
}
