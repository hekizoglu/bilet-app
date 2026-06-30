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
        setReservationSuccess(result.reservation);
      }
      else {
        const err = await res.json();
        alert(`Hata: ${err.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      alert("Bağlantı hatası");
    }
  };

  if (loading) return <div className="p-8">Yükleniyor...</div>;
  if (data.error) return <div className="text-red-500 p-8">{data.error}</div>;

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

          <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Yeni Bilet Al
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">{data.isSeated ? data.hallName : "Genel Giriş Etkinliği"}</h1>
      
      {data.paymentType === 'cardless' && (
        <div className="mb-6 inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          Bu etkinlik Kartsız Ödeme ile çalışmaktadır.
        </div>
      )}

      {!data.isSeated && (
        <div className="bg-blue-50 p-6 rounded-lg mb-8 border border-blue-100">
          <p className="text-xl">Kalan Bilet: <span className="font-bold text-blue-600">{data.available} / {data.capacity}</span></p>
        </div>
      )}

      {data.isSeated && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
          <p className="text-lg font-medium mb-4">Boş Koltuklar ({data.availableSeats.length} adet)</p>
          <div className="flex flex-wrap gap-2">
            {data.availableSeats.map((seat: any) => (
              <button 
                key={seat.id}
                onClick={() => setForm({ ...form, seatId: seat.id, seatName: seat.id })}
                className={`p-3 rounded border transition-all ${
                  form.seatId === seat.id 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {seat.id.split('-')[1]?.slice(-3) || seat.id}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold">Bilet Al</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Ad Soyad</label>
          <input required type="text" className="w-full border p-2 rounded" 
                 onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">E-Posta</label>
          <input required type="email" className="w-full border p-2 rounded"
                 onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">
          Rezervasyonu Tamamla
        </button>
      </form>
    </div>
  );
}
