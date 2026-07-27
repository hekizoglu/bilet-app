"use client";

import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, Loader2 } from 'lucide-react';

export interface LayoutData {
  isSeated: boolean;
  capacity: number; // For general admission
  hallId: string | null; // For seated
}

interface Props {
  data: LayoutData;
  onChange: (data: LayoutData) => void;
  onNext: () => void;
  onBack: () => void;
  setEffectiveCapacity: (capacity: number) => void;
}

export default function StepLayout({ data, onChange, onNext, onBack, setEffectiveCapacity }: Props) {
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);

  useEffect(() => {
    fetchHalls();
  }, []);

  const fetchHalls = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/halls`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const h = await res.json();
        setHalls(h);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveCapacity = () => {
    if (!data.isSeated) return data.capacity;
    if (!data.hallId) return 0;
    const selectedHall = halls.find(h => h.id === data.hallId);
    return selectedHall ? selectedHall.calculatedSeatCount || selectedHall.seatCount || 0 : 0;
  };

  const effectiveCapacity = getEffectiveCapacity();
  const isValid = !data.isSeated ? data.capacity > 0 : data.hallId !== null;
  const isPendingApproval = effectiveCapacity > 50;

  useEffect(() => {
    setEffectiveCapacity(effectiveCapacity);
  }, [effectiveCapacity, setEffectiveCapacity]);

  if (showDesigner) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Yeni Salon Tasarla</h2>
          <button onClick={() => setShowDesigner(false)} className="text-gray-500 hover:text-gray-800">Geri Dön</button>
        </div>
        <div className="p-10 border rounded-lg bg-gray-50 text-center">
          <p className="text-gray-600 mb-4">Kendi salonunuzu detaylı bir şekilde tasarlamak için yeni sekmede Salon Tasarımcısını açabilirsiniz. Tasarım bittikten sonra bu sayfada listeyi yenileyebilirsiniz.</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => { window.open('/profile/halls', '_blank'); }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Yeni Sekmede Tasarımcıyı Aç
            </button>
            <button 
              onClick={() => { setShowDesigner(false); fetchHalls(); }}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Listeyi Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Katılım Düzeni</h2>
        <p className="text-gray-500 mt-1">Etkinliğiniz için oturma düzenini belirleyin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onChange({ ...data, isSeated: false, hallId: null })}
          className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
            !data.isSeated
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
          }`}
        >
          <Users size={32} strokeWidth={!data.isSeated ? 2.5 : 2} />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Genel Giriş</h3>
            <p className="text-sm opacity-80 mt-1">Belirli bir kapasite ile ayaktasınız.</p>
          </div>
        </button>

        <button
          onClick={() => onChange({ ...data, isSeated: true })}
          className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
            data.isSeated
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
          }`}
        >
          <LayoutGrid size={32} strokeWidth={data.isSeated ? 2.5 : 2} />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Koltuklu / Salonlu</h3>
            <p className="text-sm opacity-80 mt-1">Katılımcılar yerlerini seçebilirler.</p>
          </div>
        </button>
      </div>

      <div className="mt-6 p-6 border rounded-xl bg-gray-50/50">
        {!data.isSeated ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tahmini Katılımcı Kapasitesi</label>
            <input
              type="number"
              min="1"
              value={data.capacity || ''}
              onChange={(e) => onChange({ ...data, capacity: parseInt(e.target.value) || 0 })}
              className="w-full md:w-1/2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Örn: 40"
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Salon Seçin</label>
              <button 
                onClick={() => setShowDesigner(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                + Yeni Tasarla
              </button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={16} /> Yükleniyor...</div>
            ) : halls.length === 0 ? (
              <div className="text-sm text-gray-500 italic p-3 border rounded-lg bg-white">
                Henüz kayıtlı bir salonunuz yok. Yeni tasarlayabilirsiniz.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {halls.map(h => (
                  <div 
                    key={h.id} 
                    onClick={() => onChange({ ...data, hallId: h.id })}
                    className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
                      data.hallId === h.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'bg-white hover:border-gray-400'
                    }`}
                  >
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">{h.name}</h4>
                      <p className="text-xs text-gray-500">Kapasite: {h.calculatedSeatCount || h.seatCount}</p>
                    </div>
                    {h.isGlobal && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Global</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {effectiveCapacity > 0 && (
          <div className={`mt-4 p-4 rounded-lg border flex items-start gap-3 ${
            isPendingApproval ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="mt-0.5">
              {isPendingApproval ? '⚠️' : '✅'}
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {isPendingApproval ? 'Yönetici Onayı Gerekiyor' : 'Hemen Yayınlanabilir'}
              </h4>
              <p className="text-sm mt-1 opacity-90">
                {isPendingApproval 
                  ? `Etkin kapasite ${effectiveCapacity} kişi olarak hesaplandı. 50 kişiyi geçtiği için etkinlik oluşturulduktan sonra admin onayına gönderilecektir.` 
                  : `Etkin kapasite ${effectiveCapacity} kişi. 50 kişinin altında olduğu için onay gerekmeksizin hemen yayınlanacaktır.`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Geri
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Devam Et
        </button>
      </div>
    </div>
  );
}
