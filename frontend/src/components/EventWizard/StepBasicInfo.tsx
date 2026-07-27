"use client";

import React from 'react';

export interface BasicInfoData {
  name: string;
  description: string;
  coverImage: string;
  date: string;
  startTime: string;
  endTime: string;
  visibility: 'PUBLIC' | 'PRIVATE';
}

interface Props {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepBasicInfo({ data, onChange, onNext, onBack }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange({ ...data, [e.target.name]: e.target.value });
  };

  const isValid = data.name.trim() !== '' && data.date !== '' && data.startTime !== '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Temel Bilgiler</h2>
        <p className="text-gray-500 mt-1">Etkinliğinizin adını, zamanını ve detaylarını belirleyin.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Adı *</label>
          <input
            type="text"
            name="name"
            value={data.name}
            onChange={handleChange}
            placeholder="Örn: Ayşe'nin 30. Yaş Günü"
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
            placeholder="Etkinlik hakkında kısa bir bilgi..."
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
            <input
              type="date"
              name="date"
              value={data.date}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kapak Görseli URL (Opsiyonel)</label>
            <input
              type="url"
              name="coverImage"
              value={data.coverImage}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Görünürlük</label>
            <select
              name="visibility"
              value={data.visibility}
              onChange={handleChange}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="PUBLIC">Herkese Açık (Keşfet'te Görünür)</option>
              <option value="PRIVATE">Özel (Sadece Davetiyeliler)</option>
            </select>
          </div>
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
