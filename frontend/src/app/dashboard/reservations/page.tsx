"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, CheckCircle, Clock } from 'lucide-react';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [refundReservation, setRefundReservation] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Müşteri Talebi');

  const fetchReservations = async (page = 1) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const token = getCookie('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations?page=${page}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || data);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const token = getCookie('token');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Rezervasyon onaylandı ve e-posta gönderildi!');
        fetchReservations(pagination.page); // Refresh list
      } else {
        toast.error('Hata: ' + data.error);
      }
    } catch (err) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Bu rezervasyonu iptal etmek ve koltuğu serbest bırakmak istediğinize emin misiniz?")) return;
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const token = getCookie('token');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Rezervasyon başarıyla iptal edildi!');
        fetchReservations(pagination.page); // Refresh list
      } else {
        toast.error('Hata: ' + data.error);
      }
    } catch (err) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleManualVerify = async (id: string) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const token = getCookie('token');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/payments/${id}/manual-verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Ödeme doğrulandı, rezervasyon onaylandı!');
        fetchReservations(pagination.page);
      } else {
        toast.error('Hata: ' + data.error);
      }
    } catch (err) {
      toast.error('Bağlantı hatası');
    }
  };

  const handleRefund = async () => {
    if (!refundReservation) return;
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      const token = getCookie('token');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/${refundReservation.id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Bilet başarıyla iade edildi!');
        setRefundReservation(null);
        fetchReservations(pagination.page);
      } else {
        toast.error('Hata: ' + data.error);
      }
    } catch (err) {
      toast.error('Bağlantı hatası');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="text-blue-600" />
          Rezervasyonlar
        </h1>
        
        {/* RSVP Filter */}
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">Tümü</option>
          <option value="ATTENDING">Katılacaklar</option>
          <option value="MAYBE">Kararsızlar</option>
          <option value="NOT_ATTENDING">Katılmayacaklar</option>
        </select>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Katılan / Toplam Misafir</p>
          <p className="text-2xl font-black text-gray-900">
            {reservations.filter(r => r.rsvpStatus === 'ATTENDING').length} / {reservations.reduce((acc, r) => acc + (r.rsvpStatus === 'ATTENDING' ? (r.guestCount || 0) + (r.childCount || 0) + 1 : 0), 0)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Katılıyorum</p>
          <p className="text-2xl font-black text-green-900">{reservations.filter(r => r.rsvpStatus === 'ATTENDING').length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">Kararsız</p>
          <p className="text-2xl font-black text-yellow-900">{reservations.filter(r => r.rsvpStatus === 'MAYBE').length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Katılamıyorum</p>
          <p className="text-2xl font-black text-red-900">{reservations.filter(r => r.rsvpStatus === 'NOT_ATTENDING').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4 font-medium">Müşteri</th>
              <th className="p-4 font-medium">Etkinlik</th>
              <th className="p-4 font-medium">Koltuk/Giriş</th>
              <th className="p-4 font-medium">RSVP & Not</th>
              <th className="p-4 font-medium">Misafir</th>
              <th className="p-4 font-medium">Ödeme</th>
              <th className="p-4 font-medium">Durum</th>
              <th className="p-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reservations.filter(r => filter === 'ALL' || r.rsvpStatus === filter).map((res) => (
              <tr key={res.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium text-gray-900">
                  {res.customer}
                  <div className="text-xs text-gray-500 font-normal">{res.email}</div>
                  {res.phone && <div className="text-xs text-gray-500 font-normal">{res.phone}</div>}
                </td>
                <td className="p-4 text-gray-900 text-sm">{res.event?.name || '-'}</td>
                <td className="p-4 text-gray-600">
                  {res.seatName ? (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium border border-gray-200 bg-gray-50">
                      {res.seatName}
                    </span>
                  ) : 'Genel Giriş'}
                </td>
                <td className="p-4">
                  {res.rsvpStatus && (
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold w-fit ${
                        res.rsvpStatus === 'ATTENDING' ? 'text-green-700 bg-green-100' :
                        res.rsvpStatus === 'MAYBE' ? 'text-yellow-700 bg-yellow-100' :
                        res.rsvpStatus === 'NOT_ATTENDING' ? 'text-red-700 bg-red-100' :
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {res.rsvpStatus === 'ATTENDING' ? 'Katılıyor' :
                         res.rsvpStatus === 'MAYBE' ? 'Kararsız' :
                         res.rsvpStatus === 'NOT_ATTENDING' ? 'Katılmıyor' : res.rsvpStatus}
                      </span>
                      {res.notes && (
                        <span className="text-[11px] text-gray-600 italic bg-gray-50 p-1.5 rounded-md mt-1 border border-gray-200" title={res.notes}>
                          📝 {res.notes.length > 30 ? res.notes.substring(0, 30) + '...' : res.notes}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-700">
                  {res.rsvpStatus === 'ATTENDING' ? (
                    <div>
                      <div>Yetişkin: <strong>{res.guestCount || 0}</strong></div>
                      <div>Çocuk: <strong>{res.childCount || 0}</strong></div>
                    </div>
                  ) : '-'}
                </td>
                <td className="p-4">
                  {res.paymentStatus && (
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      res.paymentStatus === 'paid' ? 'text-green-700 bg-green-50' : 
                      res.paymentStatus === 'refunded' ? 'text-red-700 bg-red-50 border border-red-200' :
                      res.paymentStatus === 'partially_refunded' ? 'text-purple-700 bg-purple-50 border border-purple-200' :
                      res.paymentStatus === 'pending_verification' ? 'text-orange-700 bg-orange-50 border border-orange-200' :
                      'text-gray-600 bg-gray-50'
                    }`}>
                      {res.paymentStatus === 'paid' ? 'Ödendi' : 
                       res.paymentStatus === 'refunded' ? 'İade Edildi' :
                       res.paymentStatus === 'partially_refunded' ? 'Kısmi İade' :
                       res.paymentStatus === 'pending_verification' ? 'Doğrulama Bekliyor' :
                       'Ödeme Bekleniyor'}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                      res.status === 'Onaylı' ? 'bg-green-100 text-green-800' :
                      res.status === 'Beklemede' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {res.status === 'Onaylı' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {res.status}
                    </span>
                    {res.paymentReference && (
                      <span className="text-[10px] text-gray-500 font-mono">Ref: {res.paymentReference}</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex flex-col gap-2 items-end">
                    {res.status === 'Beklemede' && res.paymentStatus !== 'pending_verification' && (
                      <button 
                        onClick={() => handleApprove(res.id)}
                        className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-medium rounded transition"
                      >
                        Onayla & Bilet Gönder
                      </button>
                    )}
                    {res.paymentStatus === 'pending_verification' && (
                      <button 
                        onClick={() => handleManualVerify(res.id)}
                        className="text-sm px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 font-medium rounded transition border border-green-200"
                      >
                        Ödemeyi Doğrula
                      </button>
                    )}
                    {res.status === 'Beklemede' && (
                      <button 
                        onClick={() => handleCancel(res.id)}
                        className="text-sm px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-medium rounded transition mt-2 w-full"
                      >
                        İptal Et
                      </button>
                    )}
                    {res.status === 'Onaylı' && res.paymentStatus === 'paid' && (
                      <button 
                        onClick={() => {
                          setRefundReservation(res);
                          setRefundAmount(String(res.event?.price || ''));
                        }}
                        className="text-sm px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-medium rounded transition border border-red-200"
                      >
                        İade Et
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Sistemde kayıtlı rezervasyon bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            disabled={pagination.page <= 1}
            onClick={() => fetchReservations(pagination.page - 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50 hover:bg-gray-50 transition font-medium text-sm"
          >
            Önceki
          </button>
          <span className="text-sm font-medium text-gray-700">
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <button 
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchReservations(pagination.page + 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50 hover:bg-gray-50 transition font-medium text-sm"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Refund Modal */}
      {refundReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🎫 Bilet İade Başlat</h3>
            <p className="text-sm text-gray-500 mb-4">
              <b>{refundReservation.customer}</b> adlı müşterinin <b>{refundReservation.event?.name}</b> biletini iptal edip iade başlatıyorsunuz.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">İade Tutarı (TL)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="örn: 150"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">İade Nedeni</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Müşteri Talebi">Müşteri Talebi</option>
                  <option value="Etkinlik İptal">Etkinlik İptal</option>
                  <option value="Yanlış Koltuk">Yanlış Koltuk Seçimi</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-stretch mt-6">
              <button
                onClick={() => setRefundReservation(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 font-semibold text-sm transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleRefund}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 font-semibold text-sm transition"
              >
                İadeyi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
