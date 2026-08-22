"use client";

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EventData {
  id: string;
  name: string;
  date: string;
  description?: string;
  effectiveCapacity: number;
  isSeated: boolean;
  hall?: { name: string };
  organizer?: { name: string; email: string };
}

interface Props {
  event: EventData;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AdminEventApprovalModal({ event, onClose, onRefresh }: Props) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (action === 'reject' && !rejectReason.trim()) {
      toast.warning("Lütfen ret gerekçesi girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const payload = action === 'reject' || action === 'suspend' ? { reason: rejectReason } : {};

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${event.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onRefresh();
        onClose();
      } else {
        const data = await res.json();
        toast.error(`Hata: ${data.error || 'İşlem başarısız'}`);
      }
    }catch {
      toast.error("Sunucuya ulaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" />
            Etkinlik Onay İncelemesi
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{event.name}</h3>
            <p className="text-gray-500 text-sm mt-1">{new Date(event.date).toLocaleString('tr-TR')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <span className="block text-gray-500 mb-1">Organizatör</span>
              <span className="font-semibold text-gray-900">{event.organizer?.name || 'Bilinmiyor'} ({event.organizer?.email || '-'})</span>
            </div>
            <div>
              <span className="block text-gray-500 mb-1">Kapasite</span>
              <span className="font-semibold text-gray-900">{event.effectiveCapacity} Kişi ({event.isSeated ? 'Koltuklu' : 'Ayakta'})</span>
            </div>
            {event.isSeated && event.hall && (
              <div className="col-span-2">
                <span className="block text-gray-500 mb-1">Salon</span>
                <span className="font-semibold text-gray-900">{event.hall.name}</span>
              </div>
            )}
          </div>

          {event.description && (
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-1">Açıklama</h4>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border">{event.description}</p>
            </div>
          )}

          {showRejectInput && (
            <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg">
              <label className="block text-sm font-semibold text-red-800 mb-2">Ret Gerekçesi (Kullanıcıya Gösterilecek)</label>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                rows={3}
                placeholder="Örn: Etkinlik kapasiteniz güvenlik sınırlarını aşıyor, lütfen salon planınızı revize edin."
              />
              <div className="mt-3 flex justify-end gap-2">
                <button 
                  onClick={() => setShowRejectInput(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
                >
                  İptal
                </button>
                <button 
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : null}
                  Reddet ve Bildir
                </button>
              </div>
            </div>
          )}
        </div>

        {!showRejectInput && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-gray-50">
            <button 
              onClick={() => handleAction('suspend')}
              disabled={isSubmitting}
              className="px-4 py-2 text-orange-600 hover:bg-orange-100 rounded-lg font-medium transition text-sm flex items-center gap-2"
            >
              Askıya Al
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowRejectInput(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition flex items-center gap-2"
              >
                <XCircle size={18} />
                Reddet
              </button>
              <button 
                onClick={() => handleAction('approve')}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />}
                Onayla ve Yayınla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
