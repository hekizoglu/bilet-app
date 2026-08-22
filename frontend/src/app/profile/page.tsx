"use client";

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Calendar, MapPin, Loader2, Navigation } from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import QRCode from "react-qr-code";

export default function ProfilePage() {
  interface MyReservation {
  id: string;
  ticketCode?: string;
  seatName?: string | null;
  seatId?: string | null;
  customer?: string;
  status?: string;
  paymentStatus?: string;
  paymentReference?: string;
  earnedPoints?: number;
  isUsed?: boolean;
  event?: { id?: string; name?: string; date?: string; isSeated?: boolean; hall?: { name?: string; address?: string | null } | null };
}
const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<MyReservation | null>(null);
  const [userDetails, setUserDetails] = useState<{ email?: string; points?: number; name?: string; telegramUsername?: string | null; iban?: string | null } | null>(null);

    const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

const fetchReservations = useCallback(async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      if (!token) return;

      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const data = await userRes.json();
        setUserDetails(data);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
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
  }, []);

useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);



  

  const handlePaymentNotification = async (resId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${resId}/request-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });
      if (res.ok) {
        toast.success("Ödeme bildiriminiz alındı. Onay sonrası biletiniz aktifleşecek.");
        fetchReservations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Bildirim başarısız.");
      }
    }catch {
      toast.error("Sunucuya bağlanılamadı.");
    }
  };

  const handleRefund = async (resId: string) => {
    if (!confirm("Biletinizi iptal edip iade talebi oluşturmak istediğinize emin misiniz?")) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${resId}/self-refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });
      if (res.ok) {
        toast.success("Biletiniz iptal edildi, iade süreci başlatıldı.");
        fetchReservations();
      } else {
        const err = await res.json();
        toast.error(err.error || "İade işlemi başarısız.");
      }
    }catch {
      toast.error("Sunucuya bağlanılamadı.");
    }
  };

  const handleTransfer = async (resId: string) => {
    const newCustomer = prompt("Bileti devredeceğiniz kişinin Adı ve Soyadı:");
    if (!newCustomer) return;
    const newEmail = prompt("Bileti devredeceğiniz kişinin E-posta adresi:");
    if (!newEmail) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${resId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCookie('token')}`
        },
        body: JSON.stringify({ newCustomer, newEmail })
      });
      if (res.ok) {
        toast.success("Biletiniz başarıyla devredildi.");
        fetchReservations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Devir işlemi başarısız.");
      }
    }catch {
      toast.error("Sunucuya bağlanılamadı.");
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 grid md:grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telegram</p>
            <p className="text-gray-900 font-medium">@{userDetails?.telegramUsername || "Bağlı Değil"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sadakat Puanı</p>
            <p className="text-gray-900 font-bold text-lg">{userDetails?.points || 0} Puan</p>
          </div>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz biletiniz yok</h3>
          <p className="text-gray-500 mb-6">Sistemde size ait bir bilet veya rezervasyon bulamadık.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition shadow-lg">
            🎟️ Yeni Etkinlikleri Keşfet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reservations.map((res) => (
            <div key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{res.event?.name}</h3>
                <div className="flex flex-col gap-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><Calendar size={16} /> {res.event?.date ? new Date(res.event.date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'}</span>
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

              {res.status === 'Onaylı' && (
                <div className="flex-shrink-0 bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center min-w-[120px]">
                  <QRCode 
                    value={res.ticketCode || "invalid_code"} 
                    size={80} 
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 100 100`}
                  />
                </div>
              )}
              
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
                  <>
                    <button
                      onClick={() => setSelectedTicket(res)}
                      className="mt-2 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition w-full"
                    >
                      Bileti Göster
                    </button>
                    <button
                      onClick={() => handleRefund(res.id)}
                      className="mt-1 text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 transition w-full font-medium"
                    >
                      İade Et
                    </button>
                    <button
                      onClick={() => handleTransfer(res.id)}
                      className="mt-1 text-xs bg-purple-100 text-purple-600 px-3 py-1.5 rounded hover:bg-purple-200 transition w-full font-medium"
                    >
                      Bileti Devret
                    </button>
                  </>
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

      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-center text-gray-900 mb-1">🎫 Giriş Bileti</h3>
            <p className="text-xs text-center text-gray-500 mb-6 font-mono">Bilet ID: {selectedTicket.ticketCode?.slice(0, 8).toUpperCase() || '—'}</p>
            
            <div className="flex flex-col items-center border-t border-b border-dashed border-gray-200 py-6 my-4 bg-gray-50 rounded-xl overflow-y-auto max-h-[60vh]">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-4">
                <QRCodeCanvas 
                  value={selectedTicket.ticketCode || ''} 
                  size={160}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-center font-bold text-lg text-blue-900">{selectedTicket.event?.name}</p>
              <p className="text-center text-xs text-gray-500 mt-1">{selectedTicket.event?.date ? new Date(selectedTicket.event.date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'}</p>
              
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

              {selectedTicket.event?.hall?.address && (
                <div className="mt-6 pt-6 border-t border-dashed border-gray-200 w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-blue-600 mb-2">
                    <Navigation size={18} />
                    <span className="text-sm font-bold">Yol Tarifi</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-2">
                    <QRCodeCanvas 
                      value={`https://maps.google.com/?q=${encodeURIComponent(selectedTicket.event.hall.address)}`} 
                      size={100}
                      level="L"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center px-4">
                    {selectedTicket.event.hall.address}
                  </p>
                </div>
              )}
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
