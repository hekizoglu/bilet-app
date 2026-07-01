'use client';
import { useState } from 'react';
import { ChevronDown, Zap } from 'lucide-react';

interface AutoGenerateConfig {
  hallLengthM: number;
  hallWidthM: number;
  tableRadiusCm: number;
  chairsPerTable: number;
  minSpacingCm: number;
  stageLengthM: number;
  stageWidthM: number;
  stageCapacity: number;
  numberingType: 'table_only' | 'table_and_seats' | 'seats_only' | 'none';
}

interface HallSettingsPanelProps {
  onAutoGenerate?: (config: AutoGenerateConfig) => void;
}

export function HallSettingsPanel({ onAutoGenerate }: HallSettingsPanelProps) {
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [hallDimensions, setHallDimensions] = useState({ width: 1000, height: 800 });
  const [tableSize, setTableSize] = useState({ radius: 40 });
  const [chairSize, setChairSize] = useState({ width: 30, height: 30 });
  const [spacing, setSpacing] = useState(180);
  const [standingCapacity, setStandingCapacity] = useState(150);
  const [numberingType, setNumberingType] = useState<'table_only' | 'table_and_seats' | 'seats_only' | 'none'>('table_and_seats');

  // Auto-generate form state
  const [autoConfig, setAutoConfig] = useState<AutoGenerateConfig>({
    hallLengthM: 12,
    hallWidthM: 8,
    tableRadiusCm: 120,
    chairsPerTable: 8,
    minSpacingCm: 100,
    stageLengthM: 6,
    stageWidthM: 2,
    stageCapacity: 150,
    numberingType: 'table_and_seats'
  });

  return (
    <div className="space-y-4">
      {/* Salon Boyutları */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Salon Boyutları (px)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={hallDimensions.width}
            onChange={(e) => setHallDimensions({ ...hallDimensions, width: parseInt(e.target.value) || 1000 })}
            placeholder="Genişlik"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="number"
            value={hallDimensions.height}
            onChange={(e) => setHallDimensions({ ...hallDimensions, height: parseInt(e.target.value) || 800 })}
            placeholder="Yükseklik"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Mevcut: {hallDimensions.width} × {hallDimensions.height}
        </p>
      </div>

      {/* Masa Çapı - metre/cm */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Masa Çapı
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={tableSize.radius * 2}
              onChange={(e) => setTableSize({ radius: parseInt(e.target.value) / 2 || 40 })}
              placeholder="Çap (cm)"
              step="5"
              min="40"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">cm (santimetre)</p>
          </div>
          <div className="flex-1">
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-gray-700">
              {((tableSize.radius * 2) / 100).toFixed(2)}m
            </div>
            <p className="text-xs text-gray-500 mt-1">metre (m)</p>
          </div>
        </div>
      </div>

      {/* Sandalye Boyutu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sandalye Boyutu
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={chairSize.width}
            onChange={(e) => setChairSize({ ...chairSize, width: parseInt(e.target.value) || 30 })}
            placeholder="G."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="number"
            value={chairSize.height}
            onChange={(e) => setChairSize({ ...chairSize, height: parseInt(e.target.value) || 30 })}
            placeholder="Y."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Masalar Arası Boşluk */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Masalar Arası Boşluk: {spacing}px
        </label>
        <input
          type="range"
          min="100"
          max="300"
          value={spacing}
          onChange={(e) => setSpacing(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* SAHNE - Ayakta Kapasitesi */}
      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300">
        <label className="block text-sm font-bold text-orange-900 mb-2">
          🎤 Sahne Alanı (Ayakta)
        </label>
        <input
          type="number"
          value={standingCapacity}
          onChange={(e) => setStandingCapacity(parseInt(e.target.value) || 0)}
          placeholder="Kapasite"
          className="w-full px-3 py-2 border-2 border-orange-400 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm font-bold"
        />
        <p className="text-xs text-orange-800 mt-1">
          Toplam ayakta kapasite ({standingCapacity} kişi)
        </p>
      </div>

      {/* Numaralı Sistem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Numaralı Sistem
        </label>
        <select
          value={numberingType}
          onChange={(e) => setNumberingType(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="table_only">Sadece Masa Numarası</option>
          <option value="table_and_seats">Masa + Koltuk Numarası</option>
          <option value="seats_only">Sadece Koltuk Numarası</option>
          <option value="none">Numaralı Değil</option>
        </select>
      </div>

      {/* İstatistikler */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
        <p className="text-xs font-bold text-blue-900 mb-2">📊 İstatistikler</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>📍 Salon: {hallDimensions.width} × {hallDimensions.height}</li>
          <li>🪑 Masa Çapı: {tableSize.radius * 2}px</li>
          <li>💺 Sandalye: {chairSize.width} × {chairSize.height}px</li>
          <li>🎤 Sahne Kapasitesi: {standingCapacity} kişi</li>
        </ul>
      </div>

      {/* Buton */}
      <button
        onClick={() => setShowAutoModal(true)}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
      >
        <Zap size={18} /> Detaylı Sahne Oluştur
      </button>

      <p className="text-xs text-gray-500 text-center">
        Tüm bilgileri doldurarak otomatik salon tasarımı yapın
      </p>

      {/* AUTO-GENERATE MODAL */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 border-b">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap size={24} /> Otomatik Salon Oluştur
              </h2>
              <p className="text-sm text-blue-100 mt-2">
                Salon bilgilerini detaylı olarak doldurun, sistem optimal dizilimi oluştursun
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* SALON BOYUTLARI */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3">📏 Salon Boyutları</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Uzunluk (metre)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.hallLengthM}
                      onChange={(e) => setAutoConfig({ ...autoConfig, hallLengthM: parseFloat(e.target.value) || 12 })}
                      step="0.5"
                      min="5"
                      max="50"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Genişlik (metre)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.hallWidthM}
                      onChange={(e) => setAutoConfig({ ...autoConfig, hallWidthM: parseFloat(e.target.value) || 8 })}
                      step="0.5"
                      min="5"
                      max="50"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* MASA VE KOLTUK */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-3">🪑 Masa & Koltuk Ayarları</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Masa Çapı (cm)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.tableRadiusCm}
                      onChange={(e) => setAutoConfig({ ...autoConfig, tableRadiusCm: parseFloat(e.target.value) || 120 })}
                      step="10"
                      min="60"
                      max="200"
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Masa Başı Kişi (adet)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.chairsPerTable}
                      onChange={(e) => setAutoConfig({ ...autoConfig, chairsPerTable: parseInt(e.target.value) || 8 })}
                      step="1"
                      min="2"
                      max="12"
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* MASALAR ARASI MESAFE */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-900 mb-3">📐 Masalar Arası Mesafe</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Minimum Boşluk (cm): {autoConfig.minSpacingCm}cm
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={autoConfig.minSpacingCm}
                    onChange={(e) => setAutoConfig({ ...autoConfig, minSpacingCm: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-amber-700 mt-1">Masalar arası geçiş alanı</p>
                </div>
              </div>

              {/* SAHNE ALANI */}
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300">
                <h3 className="font-bold text-orange-900 mb-3">🎤 Sahne/Stage Alanı</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sahne Uzunluğu (m)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.stageLengthM}
                      onChange={(e) => setAutoConfig({ ...autoConfig, stageLengthM: parseFloat(e.target.value) || 6 })}
                      step="0.5"
                      min="2"
                      max="15"
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sahne Genişliği (m)
                    </label>
                    <input
                      type="number"
                      value={autoConfig.stageWidthM}
                      onChange={(e) => setAutoConfig({ ...autoConfig, stageWidthM: parseFloat(e.target.value) || 2 })}
                      step="0.5"
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sahne Kapasitesi (ayakta kişi): {autoConfig.stageCapacity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={Math.min(autoConfig.stageCapacity, 2000)}
                    onChange={(e) => setAutoConfig({ ...autoConfig, stageCapacity: Math.min(parseInt(e.target.value), 2000) })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* NUMARALAMA SİSTEMİ */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-900 mb-3">🏷️ Numaralama Sistemi</h3>
                <select
                  value={autoConfig.numberingType}
                  onChange={(e) => setAutoConfig({ ...autoConfig, numberingType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="table_only">Sadece Masa Numarası (Kolay)</option>
                  <option value="table_and_seats">Masa + Koltuk Numarası (Detaylı)</option>
                  <option value="seats_only">Sadece Koltuk Numarası</option>
                  <option value="none">Numaralı Değil (Serbest Oturma)</option>
                </select>
              </div>

              {/* İZLENİM */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-4 rounded-lg border border-gray-300">
                <h4 className="font-bold text-gray-800 mb-2">📊 Tahmini Bilgiler</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Alan Boyutu</p>
                    <p className="font-bold text-gray-800">
                      {(autoConfig.hallLengthM * autoConfig.hallWidthM).toFixed(1)} m²
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Tahmini Masa Sayısı</p>
                    <p className="font-bold text-gray-800">
                      {Math.floor((autoConfig.hallLengthM * autoConfig.hallWidthM) / 2)}±
                    </p>
                  </div>
                </div>
                
                {/* 🎯 KAPASİTE KONTROL */}
                <div className="mt-3 pt-3 border-t border-gray-400">
                  <p className="text-xs text-gray-600 mb-1">⭐ Tahmini Toplam Kapasite</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            autoConfig.stageCapacity >= 2000 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (autoConfig.stageCapacity / 2000) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${autoConfig.stageCapacity >= 2000 ? 'text-red-600' : 'text-green-600'}`}>
                      {autoConfig.stageCapacity} / 2000
                    </span>
                  </div>
                  {autoConfig.stageCapacity >= 2000 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Sahne kapasitesi max 2000'ye kadar sınırlıdır</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3">
              <button
                onClick={() => setShowAutoModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                ❌ İptal
              </button>
              <button
                onClick={() => {
                  onAutoGenerate?.(autoConfig);
                  setShowAutoModal(false);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Zap size={18} /> Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
