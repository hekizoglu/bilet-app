"use client";

import React from 'react';

export interface BasicInfoData {
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  price: string; // string input olarak tutulur, submit'te sayıya çevrilir
  paymentType: 'free' | 'creditcard' | 'cardless';
}

interface Props {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onNext: () => void;
  onBack: () => void;
}

const inputCls =
  "w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors";

export default function StepBasicInfo({ data, onChange, onNext, onBack }: Props) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const name = e.target.name;
    const value = e.target.value;
    const next = { ...data, [name]: value };

    // Ücret girildiğinde ödeme türü "ücretsiz" kalamaz — otomatik olarak kartsız ödemeye geçir
    if (name === 'price' && Number(value) > 0 && next.paymentType === 'free') {
      next.paymentType = 'cardless';
    }
    // Ücret 0/silindiğinde ödeme türünü ücretsize döndür
    if (name === 'price' && (Number(value) <= 0 || value === '')) {
      next.paymentType = 'free';
    }

    onChange(next);
  };

  const priceNum = Number(data.price);
  const isValid =
    data.name.trim() !== '' &&
    data.date !== '' &&
    data.startTime !== '' &&
    !isNaN(priceNum) &&
    priceNum >= 0;

  // Bugünün tarihi (yerel) — geçmiş tarih seçimini engelle
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Temel Bilgiler</h2>
        <p className="text-gray-500 mt-1">Etkinliğinizin adını, zamanını, fiyatını ve detaylarını belirleyin.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Adı *</label>
          <input
            type="text"
            name="name"
            value={data.name}
            onChange={handleChange}
            placeholder="Örn: Ayşe&apos;nin 30. Yaş Günü"
            className={inputCls}
            maxLength={120}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
          <textarea
            name="description"
            value={data.description}
            onChange={handleChange}
            rows={3}
            placeholder="Etkinlik hakkında kısa bir bilgi... (katılımcıların göreceği açıklama)"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
            <input
              type="date"
              name="date"
              value={data.date}
              min={minDate}
              onChange={handleChange}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Saati *</label>
            <input
              type="time"
              name="startTime"
              value={data.startTime}
              onChange={handleChange}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Saati</label>
            <input
              type="time"
              name="endTime"
              value={data.endTime}
              onChange={handleChange}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bilet Fiyatı (₺) *</label>
            <input
              type="number"
              name="price"
              value={data.price}
              min="0"
              step="0.01"
              onChange={handleChange}
              placeholder="0 = Ücretsiz etkinlik"
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {priceNum > 0
                ? 'Ücretli etkinlik: ödeme yöntemi aşağıdan seçilir.'
                : '0 bırakırsanız etkinlik ücretsiz olur.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Türü</label>
            <select
              name="paymentType"
              value={data.paymentType}
              onChange={handleChange}
              disabled={priceNum <= 0}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="free">Ücretsiz (Ödeme yok)</option>
              <option value="cardless">Kartsız (Havale / EFT / Telegram)</option>
              <option value="creditcard">Kredi Kartı</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {priceNum <= 0
                ? 'Ücretli yapmak için fiyat girin.'
                : data.paymentType === 'cardless'
                  ? 'Müşteri banka havalesi ile öder, siz onaylarsınız.'
                  : 'Müşteri kredi kartı ile öder (entegrasyon).'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Görünürlük</label>
          <select
            name="visibility"
            value={data.visibility}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="PUBLIC">Herkese Açık (Keşfet'te Görünür)</option>
            <option value="PRIVATE">Özel (Sadece Davetiyeliler)</option>
          </select>
        </div>
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
