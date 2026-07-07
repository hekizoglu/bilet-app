"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

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
    couponCode: ''
  });
  const [discount, setDiscount] = useState<{type: string, value: number} | null>(null);
  const [selectionMode, setSelectionMode] = useState<'list' | 'map'>('list');

  const [reservationSuccess, setReservationSuccess] = useState<any>(null);
  const [adminPaymentInfo, setAdminPaymentInfo] = useState<any>(null);

  useEffect(() => {
    // 1. Veriyi Getir
    fetch(`http://localhost:5000/api/reservations/availability/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        if (d.paymentType === 'cardless') {
          fetch('http://localhost:5000/api/users/admin-payment-info')
            .then(r => r.json())
            .then(p => setAdminPaymentInfo(p))
            .catch(console.error);
        }
      })
      .catch(console.error);

    let socket: any;

    if (data?.eventId) {
      // 2. Gerçek Zamanlı Socket Bağlantısı
      socket = io('http://localhost:5000');
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
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [id, data?.eventId]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (data.isSeated && !form.seatId) {
      alert("Lütfen bir koltuk seçin.");
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        eventIdOrSlug: id,
        customer: form.name,
        email: form.email,
        phone: form.phone,
        couponCode: form.couponCode || undefined
      };
      if (data.isSeated) {
        payload.seatId = form.seatId;
      }
      const res = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        // EĞER ÖDEMELİ İSE DOĞRUDAN MOBİL ÖDEME SAYFASINA YÖNLENDİR
        if (data.paymentType && data.paymentType !== 'free') {
          router.push(`/payment/mobile?id=${result.reservation.id}`);
        } else {
          setReservationSuccess(result.reservation);
        }
      }
      else {
        const err = await res.json();
        alert(`Hata: ${err.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      alert("Bağlantı hatası");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/events/${id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          email: form.email,
          phone: form.phone
        })
      });
      const result = await res.json();
      if (res.ok) {
        alert("Bekleme listesine başarıyla eklendiniz! Bilet iptali olursa anında haber vereceğiz.");
        window.location.reload();
      } else {
        alert(`Hata: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      alert("Bağlantı hatası");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
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
          
          {(reservationSuccess.mailSent === 'queued' || reservationSuccess.mailSent === false) && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-sm mb-6 text-left">
              <strong>🔔 Bilgilendirme:</strong> Biletiniz başarıyla sistemimize kaydedildi. E-posta sistemindeki yoğunluk nedeniyle e-bilet gönderiminiz arka planda işlenmektedir (Lütfen daha sonra Spam klasörünüzü de kontrol edin). Biletinize anında <strong>"Biletlerim"</strong> sekmesinden ulaşabilirsiniz.
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

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
          {data.isSeated ? data.hallName : "Genel Giriş Etkinliği"}
        </h1>
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
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200 mb-4">
                  {data.hallLayout ? (
                    <DynamicSeatMapViewer 
                      layoutJson={data.hallLayout}
                      availableSeats={data.availableSeats}
                      selectedSeatId={form.seatId}
                      onSeatSelect={(id) => {
                        const seat = data.availableSeats.find((s: any) => s.id === id);
                        if (seat) {
                          setForm({ ...form, seatId: seat.id, seatName: seat.name });
                          toast.success(`Koltuk ${seat.name} seçildi`);
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
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[70px]">
                          Sıra {index + 1}:
                        </span>
                        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
                          {row.seats.map((seat: any) => (
                            <button 
                              key={seat.id}
                              type="button"
                              onClick={() => setForm({ ...form, seatId: seat.id, seatName: seat.name })}
                              className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                                form.seatId === seat.id 
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                            >
                              {seat.name}
                            </button>
                          ))}
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

        {/* Sağ Sütun: Rezervasyon Formu veya Bekleme Listesi */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">İndirim Kuponu (Opsiyonel)</label>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm uppercase"
                           placeholder="KOD"
                           value={form.couponCode}
                           onChange={e => setForm({...form, couponCode: e.target.value.toUpperCase()})} />
                    <button type="button" 
                            onClick={async () => {
                              if (!form.couponCode) return;
                              const res = await fetch('http://localhost:5000/api/coupons/validate', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ code: form.couponCode })
                              });
                              const result = await res.json();
                              if (res.ok) {
                                setDiscount({ type: result.discountType, value: result.discountValue });
                                alert("Kupon başarıyla uygulandı!");
                              } else {
                                alert(result.error);
                                setDiscount(null);
                                setForm({...form, couponCode: ''});
                              }
                            }}
                            className="bg-gray-100 px-4 rounded-xl font-bold hover:bg-gray-200 transition">Uygula</button>
                  </div>
                  {discount && (
                    <p className="text-green-600 text-xs mt-2 font-bold">Kupon aktif: {discount.type === 'PERCENTAGE' ? `%${discount.value} indirim` : `${discount.value} TL indirim`}</p>
                  )}
                </div>
                
                {/* Fiyat Özeti */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-500">Bilet Fiyatı:</span>
                    <span className="font-semibold">{data.price} ₺</span>
                  </div>
                  {discount && (
                    <div className="flex justify-between items-center text-sm text-green-600 mb-1">
                      <span>İndirim:</span>
                      <span>-{discount.type === 'PERCENTAGE' ? (data.price * discount.value / 100).toFixed(2) : discount.value.toFixed(2)} ₺</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2">
                    <span>Toplam Ödenecek:</span>
                    <span>
                      {discount 
                        ? Math.max(0, data.price - (discount.type === 'PERCENTAGE' ? (data.price * discount.value / 100) : discount.value)).toFixed(2)
                        : data.price} ₺
                    </span>
                  </div>
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
          
          {form.seatId && (
            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-sm font-semibold border border-blue-100">
              Seçilen Koltuk: <span className="underline font-mono">{form.seatName}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md text-sm flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-500/10 cursor-pointer'}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  İşleniyor...
                </>
              ) : (
                'Rezervasyonu Tamamla'
              )}
            </button>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
