"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function CustomerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', seatId: '', seatName: '' });

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

    // 2. Gerçek Zamanlı Socket Bağlantısı
    const socket = io('http://localhost:5000');
    socket.emit('join_event', id);

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

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          customer: form.name,
          email: form.email,
          seatId: form.seatId || null,
          seatName: form.seatName || null
        })
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
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;
  if (data.error) return <div className="text-red-500 p-8 text-center">{data.error}</div>;

  if (reservationSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-green-50 text-green-800 p-8 rounded-2xl border border-green-100 shadow-sm">
          <h1 className="text-3xl font-bold mb-4">Rezervasyon Başarılı!</h1>
          <p className="text-lg mb-6">Bilet talebiniz alınmıştır. Bilgiler e-posta adresinize gönderildi.</p>
          
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
              <p className="text-lg font-bold mb-4 text-gray-800">Boş Koltuk Seçimi ({data.availableSeats.length} adet)</p>
              
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
                            onClick={() => setForm({ ...form, seatId: seat.id, seatName: seat.id.split('-')[1]?.slice(-3) || seat.id })}
                            className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                              form.seatId === seat.id 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20' 
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            {seat.id.split('-')[1]?.slice(-3) || seat.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Boş koltuk kalmadı.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sağ Sütun: Rezervasyon Formu */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
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
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition shadow-md shadow-green-500/10 text-sm cursor-pointer">
              Rezervasyonu Tamamla
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
