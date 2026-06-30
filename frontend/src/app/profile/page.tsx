"use client";

import { useState, useEffect } from 'react';
import { Ticket, Calendar, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reservations/my', {
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Biletler yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentNotification = async (resId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/reservations/${resId}/request-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });
      if (res.ok) {
        alert("Ödeme bildiriminiz başarıyla alındı. Yönetici onayından sonra biletiniz onaylanacaktır.");
        fetchReservations();
      } else {
        const err = await res.json();
        alert(err.error || "Bildirim başarısız.");
      }
    } catch (error) {
      alert("Sunucuya bağlanılamadı.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Biletleriniz Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Ticket className="text-blue-600" />
        Biletlerim
      </h1>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz biletiniz yok</h3>
          <p className="text-gray-500 mb-6">Sistemde size ait bir bilet veya rezervasyon bulamadık.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reservations.map((res: any) => (
            <div key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{res.event?.name}</h3>
                <div className="flex flex-col gap-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><Calendar size={16} /> {new Date(res.event?.date).toLocaleString('tr-TR')}</span>
                  {res.event?.isSeated ? (
                    <span className="flex items-center gap-1.5"><MapPin size={16} /> Koltuk: {res.seatName || res.seatId}</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><MapPin size={16} /> Genel Giriş</span>
                  )}
                  {res.paymentReference && (
                    <span className="mt-2 text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block w-fit font-mono text-xs">
                      Ref: {res.paymentReference}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 min-w-[120px]">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  res.status === 'Onaylı' ? 'bg-green-100 text-green-800' :
                  res.status === 'Beklemede' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {res.status}
                </span>
                
                {res.paymentStatus && (
                  <span className={`text-xs font-medium ${
                    res.paymentStatus === 'paid' ? 'text-green-600' : 
                    res.paymentStatus === 'pending_verification' ? 'text-blue-500' :
                    'text-orange-500'
                  }`}>
                    {res.paymentStatus === 'paid' ? 'Ödendi' : 
                     res.paymentStatus === 'pending_verification' ? 'Doğrulama Bekleniyor' :
                     'Ödeme Bekleniyor'}
                  </span>
                )}

                {res.status === 'Onaylı' && (
                  <button
                    onClick={() => setSelectedTicket(res)}
                    className="mt-2 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition"
                  >
                    Bileti Göster
                  </button>
                )}
                
                {res.paymentStatus === 'pending' && res.status === 'Beklemede' && (
                  <button
                    onClick={() => handlePaymentNotification(res.id)}
                    className="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition"
                  >
                    Ödemeyi Bildir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-center text-gray-900 mb-1">🎫 Giriş Bileti</h3>
            <p className="text-xs text-center text-gray-500 mb-6 font-mono">Bilet ID: {selectedTicket.ticketCode.slice(0, 8).toUpperCase()}</p>
            
            <div className="flex flex-col items-center border-t border-b border-dashed border-gray-200 py-6 my-4 bg-gray-50 rounded-xl">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedTicket.ticketCode}`} 
                alt="QR Code" 
                className="w-48 h-48 border-2 border-white rounded-lg shadow-sm mb-4"
              />
              <p className="text-center font-bold text-lg text-blue-900">{selectedTicket.event?.name}</p>
              <p className="text-center text-xs text-gray-500 mt-1">{new Date(selectedTicket.event?.date).toLocaleString('tr-TR')}</p>
              
              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-gray-500">Müşteri</span>
                <p className="font-semibold text-gray-800">{selectedTicket.customer}</p>
              </div>

              <div className="mt-3 text-center">
                <span className="text-xs font-semibold text-gray-500">Koltuk Bilgisi</span>
                <p className="font-bold text-blue-700">
                  {selectedTicket.event?.isSeated ? (selectedTicket.seatName || selectedTicket.seatId) : 'Genel Giriş'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-stretch mt-6">
              <button
                onClick={() => window.print()}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 font-semibold text-sm transition"
              >
                Yazdır
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 font-semibold text-sm transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
