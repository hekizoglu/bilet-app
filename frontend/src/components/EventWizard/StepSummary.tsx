"use client";

import React from 'react';
import { Calendar, Clock, Users, Globe, Lock, Loader2, CreditCard, Banknote, Gift } from 'lucide-react';
import { BasicInfoData } from './StepBasicInfo';
import { LayoutData } from './StepLayout';

interface Props {
  eventType: string;
  basicInfo: BasicInfoData;
  layout: LayoutData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  effectiveCapacity: number;
  error?: string | null;
}

const PAYMENT_LABELS: Record<string, { label: string; Icon: any }> = {
  free: { label: 'Ücretsiz', Icon: Gift },
  cardless: { label: 'Kartsız (Havale/EFT)', Icon: Banknote },
  creditcard: { label: 'Kredi Kartı', Icon: CreditCard },
};

export default function StepSummary({
  eventType,
  basicInfo,
  layout,
  onSubmit,
  onBack,
  isSubmitting,
  effectiveCapacity,
  error,
}: Props) {
  const isPendingApproval = effectiveCapacity > 50;
  const priceNum = Number(basicInfo.price) || 0;
  const { label: paymentLabel, Icon: PaymentIcon } = PAYMENT_LABELS[basicInfo.paymentType] || PAYMENT_LABELS.free;

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return d; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Özet ve Yayın</h2>
        <p className="text-gray-500 mt-1">Etkinlik bilgilerinizi son kez kontrol edip yayınlayın.</p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="h-32 w-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white/60 font-black text-3xl uppercase tracking-wider px-4 text-center">
            {basicInfo.name}
          </span>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase">
              {eventType}
            </span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1">
              {basicInfo.visibility === 'PUBLIC' ? <Globe size={12}/> : <Lock size={12}/>}
              {basicInfo.visibility === 'PUBLIC' ? 'Herkese Açık' : 'Özel'}
            </span>
            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center gap-1">
              <PaymentIcon size={12} />
              {paymentLabel}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">{basicInfo.name}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-gray-400" />
              <span>{formatDate(basicInfo.date)} {basicInfo.startTime && `• ${basicInfo.startTime}`}</span>
            </div>
            {basicInfo.endTime && (
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <span>Bitiş: {basicInfo.endTime}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users size={18} className="text-gray-400" />
              <span>
                {layout.isSeated ? 'Koltuklu Düzen' : 'Genel Giriş'}
                <span className="font-semibold text-gray-900 ml-1">({effectiveCapacity} Kişi)</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">
                {priceNum > 0 ? `${priceNum.toLocaleString('tr-TR')} ₺ / kişi` : 'Ücretsiz'}
              </span>
            </div>
          </div>

          {basicInfo.description && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-gray-700 whitespace-pre-line">{basicInfo.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border flex items-start gap-3 ${
        isPendingApproval ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'
      }`}>
        <div className="mt-0.5 text-xl">
          {isPendingApproval ? '⏳' : '🚀'}
        </div>
        <div>
          <h4 className="font-semibold text-base">
            {isPendingApproval ? 'Yönetici Onayı Beklenecek' : 'Doğrudan Yayınlanacak'}
          </h4>
          <p className="text-sm mt-1 opacity-90">
            {isPendingApproval
              ? 'Etkinliğiniz 50 kişiden fazla kapasiteye sahip olduğu için güvenlik gereği oluşturulduktan sonra yönetici onayına gönderilecektir. Onaylanana kadar "Taslak" olarak kalır.'
              : 'Etkinliğinizin kapasitesi limitler dahilinde olduğundan onay gerekmeksizin hemen aktif olacaktır.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          <strong className="font-semibold">Hata:</strong> {error}
        </div>
      )}

      <div className="flex justify-between pt-6 border-t mt-8">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Geri
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> Kaydediliyor...</>
          ) : (
            isPendingApproval ? 'Onaya Gönder' : 'Yayınla'
          )}
        </button>
      </div>
    </div>
  );
}
