'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, Zap,
  Music, Users, BookOpen, Utensils, Shield, Hash, LayoutTemplate
} from 'lucide-react';

// ─── Tipler ───────────────────────────────────────────────────────────────────

type EventType =
  | 'wedding'    // Düğün / Nikah
  | 'concert'    // Konser / Müzik
  | 'congress'   // Kongre / Konferans
  | 'gala'       // Gala / Yemekli
  | 'theater'    // Tiyatro / Gösteri
  | 'fair'       // Fuar / Sergi
  | 'sport'      // Spor
  | 'other';     // Diğer

type SeatingStyle = 'banquet' | 'theater' | 'cocktail' | 'classroom' | 'mixed';
type StagePosition = 'front' | 'back' | 'side_left' | 'side_right' | 'center';
type NumberingType = 'table_only' | 'table_and_seats' | 'seats_only' | 'none';

interface WizardData {
  // Adım 1 – Etkinlik Türü
  eventType: EventType;
  eventName: string;
  // Adım 2 – Kapasite
  totalGuests: number;
  vipEnabled: boolean;
  vipCount: number;
  // Adım 3 – Salon Boyutları
  hallLengthM: number;
  hallWidthM: number;
  // Adım 4 – Oturma Düzeni
  seatingStyle: SeatingStyle;
  tableRadiusCm: number;
  chairsPerTable: number;
  minSpacingCm: number;
  // Adım 5 – Sahne & Performans
  stageCount: number;
  stagePosition: StagePosition;
  stageLengthM: number;
  stageWidthM: number;
  hasDanceFloor: boolean;
  danceFloorM: number;
  hasPodium: boolean;
  // Adım 6 – Servis Alanları
  bistroCount: number;
  buffetCount: number;
  receptionDeskCount: number;
  // Adım 7 – Güvenlik & Çıkışlar
  mainEntranceCount: number;
  emergencyExitCount: number;
  hasDisabledAccess: boolean;
  // Adım 8 – Numaralama
  numberingType: NumberingType;
  chairNumbering: boolean;
}

// ─── Etkinlik türlerine göre akıllı varsayılanlar ─────────────────────────────

const EVENT_PRESETS: Record<EventType, Partial<WizardData>> = {
  wedding: {
    seatingStyle: 'banquet', tableRadiusCm: 150, chairsPerTable: 10,
    stageCount: 1, hasDanceFloor: true, danceFloorM: 6,
    bistroCount: 2, mainEntranceCount: 1, emergencyExitCount: 2,
    numberingType: 'table_only', chairNumbering: false,
  },
  concert: {
    seatingStyle: 'theater', tableRadiusCm: 0, chairsPerTable: 1,
    stageCount: 1, stagePosition: 'front', stageLengthM: 10, stageWidthM: 4,
    bistroCount: 3, mainEntranceCount: 2, emergencyExitCount: 4,
    numberingType: 'seats_only', chairNumbering: true,
  },
  congress: {
    seatingStyle: 'classroom', tableRadiusCm: 0, chairsPerTable: 3,
    stageCount: 1, hasPodium: true, stageLengthM: 6, stageWidthM: 2,
    bistroCount: 1, mainEntranceCount: 2, emergencyExitCount: 2,
    numberingType: 'table_and_seats', chairNumbering: true,
  },
  gala: {
    seatingStyle: 'banquet', tableRadiusCm: 130, chairsPerTable: 8,
    stageCount: 1, stageLengthM: 6, stageWidthM: 2,
    bistroCount: 2, buffetCount: 1, mainEntranceCount: 1, emergencyExitCount: 2,
    numberingType: 'table_only', chairNumbering: false,
  },
  theater: {
    seatingStyle: 'theater', tableRadiusCm: 0, chairsPerTable: 1,
    stageCount: 1, stagePosition: 'front', stageLengthM: 8, stageWidthM: 5,
    mainEntranceCount: 2, emergencyExitCount: 4,
    numberingType: 'seats_only', chairNumbering: true,
  },
  fair: {
    seatingStyle: 'mixed', tableRadiusCm: 80, chairsPerTable: 4,
    stageCount: 0, bistroCount: 4, buffetCount: 2,
    mainEntranceCount: 3, emergencyExitCount: 3,
    numberingType: 'none', chairNumbering: false,
  },
  sport: {
    seatingStyle: 'theater', tableRadiusCm: 0, chairsPerTable: 1,
    stageCount: 0, mainEntranceCount: 4, emergencyExitCount: 6,
    numberingType: 'seats_only', chairNumbering: true,
  },
  other: {
    seatingStyle: 'banquet', tableRadiusCm: 120, chairsPerTable: 8,
    stageCount: 1, mainEntranceCount: 1, emergencyExitCount: 2,
    numberingType: 'table_and_seats', chairNumbering: false,
  },
};

// ─── Başlangıç Verisi ─────────────────────────────────────────────────────────

const DEFAULT_DATA: WizardData = {
  eventType: 'wedding',
  eventName: '',
  totalGuests: 200,
  vipEnabled: false,
  vipCount: 0,
  hallLengthM: 20,
  hallWidthM: 15,
  seatingStyle: 'banquet',
  tableRadiusCm: 150,
  chairsPerTable: 10,
  minSpacingCm: 100,
  stageCount: 1,
  stagePosition: 'front',
  stageLengthM: 6,
  stageWidthM: 2,
  hasDanceFloor: false,
  danceFloorM: 5,
  hasPodium: false,
  bistroCount: 0,
  buffetCount: 0,
  receptionDeskCount: 1,
  mainEntranceCount: 1,
  emergencyExitCount: 2,
  hasDisabledAccess: true,
  numberingType: 'table_and_seats',
  chairNumbering: false,
};

// ─── Yardımcı: Kapasite Tahmini ──────────────────────────────────────────────

function estimateCapacity(d: WizardData): number {
  if (d.seatingStyle === 'theater' || d.seatingStyle === 'classroom') {
    const area = d.hallLengthM * d.hallWidthM;
    const stageArea = d.stageCount > 0 ? d.stageLengthM * d.stageWidthM : 0;
    const danceArea = d.hasDanceFloor ? d.danceFloorM * d.danceFloorM : 0;
    return Math.floor((area - stageArea - danceArea) / 0.6);
  }
  const tableDiam = d.tableRadiusCm > 0 ? (d.tableRadiusCm / 100) : 1.2;
  const spacing = d.minSpacingCm / 100;
  const stageArea = d.stageCount > 0 ? d.stageLengthM * d.stageWidthM + 10 : 0;
  const danceArea = d.hasDanceFloor ? d.danceFloorM * d.danceFloorM : 0;
  const usable = d.hallLengthM * d.hallWidthM - stageArea - danceArea;
  const tables = Math.floor(usable / Math.pow(tableDiam + spacing, 2));
  return Math.min(tables * d.chairsPerTable, 2000);
}

// ─── Adım Bileşenleri ─────────────────────────────────────────────────────────

function Step1EventType({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const events: { type: EventType; label: string; icon: string; desc: string }[] = [
    { type: 'wedding',  label: 'Düğün / Nikah',      icon: '💍', desc: 'Yuvarlak masalar, dans pisti, açık büfe' },
    { type: 'concert',  label: 'Konser / Müzik',      icon: '🎸', desc: 'Büyük sahne, numaralı koltuk sıraları' },
    { type: 'congress', label: 'Kongre / Konferans',  icon: '📋', desc: 'Sınıf düzeni, kürsü, projeksiyon' },
    { type: 'gala',     label: 'Gala / Yemekli',      icon: '🥂', desc: 'VIP masa, sahne, servis koridorları' },
    { type: 'theater',  label: 'Tiyatro / Gösteri',   icon: '🎭', desc: 'Sahne ön, sıralı numaralı koltuklar' },
    { type: 'fair',     label: 'Fuar / Sergi',         icon: '🏛️', desc: 'Stant alanları, birden fazla giriş' },
    { type: 'sport',    label: 'Spor Etkinliği',       icon: '⚽', desc: 'Tribün düzeni, çok sayıda çıkış' },
    { type: 'other',    label: 'Diğer',                icon: '📌', desc: 'Özel yapılandırma' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik / Organizasyon Adı</label>
        <input
          type="text"
          value={data.eventName}
          onChange={e => update({ eventName: e.target.value })}
          placeholder="örn. Ahmet & Ayşe Düğünü"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Türü Seçin</label>
        <div className="grid grid-cols-2 gap-3">
          {events.map(ev => (
            <button
              key={ev.type}
              onClick={() => {
                const preset = EVENT_PRESETS[ev.type];
                update({ eventType: ev.type, ...preset });
              }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                data.eventType === ev.type
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="text-2xl mb-1">{ev.icon}</div>
              <div className="font-semibold text-sm text-gray-800">{ev.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ev.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2Capacity({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tahmini Katılımcı Sayısı: <span className="text-blue-600 font-bold">{data.totalGuests} kişi</span>
        </label>
        <input
          type="range" min={10} max={2000} step={10}
          value={data.totalGuests}
          onChange={e => update({ totalGuests: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10</span><span>500</span><span>1000</span><span>2000</span>
        </div>
        <input
          type="number" min={10} max={2000}
          value={data.totalGuests}
          onChange={e => update({ totalGuests: Math.min(2000, parseInt(e.target.value) || 10) })}
          className="w-32 mt-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold"
        />
      </div>
      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <input
          id="vip" type="checkbox" checked={data.vipEnabled}
          onChange={e => update({ vipEnabled: e.target.checked })}
          className="w-4 h-4 accent-amber-500"
        />
        <label htmlFor="vip" className="font-semibold text-amber-900 text-sm">VIP Alan Var mı?</label>
      </div>
      {data.vipEnabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">VIP Kişi Sayısı</label>
          <input
            type="number" min={1} max={data.totalGuests}
            value={data.vipCount}
            onChange={e => update({ vipCount: Math.min(data.totalGuests, parseInt(e.target.value) || 0) })}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
          />
          <p className="text-xs text-amber-700 mt-1">
            VIP misafirler ayrı bir bölüme yerleştirilir (sahne yakını)
          </p>
        </div>
      )}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-800">
        <p className="font-bold mb-1">ℹ️ Yasal Zorunluluk</p>
        <p>Türk güvenlik yönetmelikleri gereği 200+ kişilik etkinliklerde en az 2 acil çıkış olmalıdır. 1000+ kişide 4 çıkış zorunludur.</p>
      </div>
    </div>
  );
}

function Step3Dimensions({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const area = data.hallLengthM * data.hallWidthM;
  const density = data.totalGuests / area;
  const densityOk = density < 2.0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Uzunluk (m)</label>
          <input
            type="number" min={5} max={200} step={0.5}
            value={data.hallLengthM}
            onChange={e => update({ hallLengthM: parseFloat(e.target.value) || 10 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (m)</label>
          <input
            type="number" min={5} max={200} step={0.5}
            value={data.hallWidthM}
            onChange={e => update({ hallWidthM: parseFloat(e.target.value) || 10 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className={`p-4 rounded-xl border-2 ${densityOk ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-400'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm">{densityOk ? '✅ Yeterli Alan' : '⚠️ Alan Yetersiz!'}</span>
          <span className="text-xs text-gray-600">{density.toFixed(2)} kişi/m²</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white rounded-lg p-2">
            <p className="text-gray-500">Alan</p>
            <p className="font-bold text-gray-800">{area.toFixed(0)} m²</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="text-gray-500">Katılımcı</p>
            <p className="font-bold text-gray-800">{data.totalGuests}</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="text-gray-500">Önerilen min.</p>
            <p className="font-bold text-gray-800">{(data.totalGuests * 0.6).toFixed(0)} m²</p>
          </div>
        </div>
        {!densityOk && (
          <p className="text-xs text-red-700 mt-2 font-medium">
            Önerilen minimum: {Math.ceil(data.totalGuests * 0.6)}m² — Salonunuzu büyütün veya katılımcı sayısını azaltın.
          </p>
        )}
      </div>

      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
        <p className="font-bold text-gray-800 mb-1">📏 Uluslararası Standartlar</p>
        <ul className="space-y-0.5">
          <li>• Banket (oturmalı): 1.0–1.5 m² / kişi</li>
          <li>• Tiyatro (sıralı koltuk): 0.5–0.7 m² / kişi</li>
          <li>• Kokteyl (ayaküstü): 0.3–0.5 m² / kişi</li>
          <li>• Konferans (sınıf): 1.5–2.0 m² / kişi</li>
        </ul>
      </div>
    </div>
  );
}

function Step4Seating({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const styles: { id: SeatingStyle; icon: string; label: string; desc: string }[] = [
    { id: 'banquet',   icon: '🍽️', label: 'Banket (Yuvarlak Masa)', desc: 'Düğün, gala — yuvarlak masalar' },
    { id: 'theater',   icon: '🎬', label: 'Tiyatro (Koltuk Sıraları)', desc: 'Konser, gösteri — sıralı koltuklar' },
    { id: 'classroom', icon: '📚', label: 'Sınıf Düzeni', desc: 'Kongre, eğitim — masa+koltuk sıraları' },
    { id: 'cocktail',  icon: '🍹', label: 'Kokteyl (Ayaküstü)', desc: 'Bistro masaları, açık alan' },
    { id: 'mixed',     icon: '🔀', label: 'Karma Düzen', desc: 'Birden fazla alan tipi' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-2">
        {styles.map(s => (
          <button key={s.id} onClick={() => update({ seatingStyle: s.id })}
            className={`p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
              data.seatingStyle === s.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
            }`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="font-bold text-sm text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
            {data.seatingStyle === s.id && <Check size={18} className="ml-auto text-purple-600" />}
          </button>
        ))}
      </div>

      {(data.seatingStyle === 'banquet' || data.seatingStyle === 'mixed') && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
          <p className="font-bold text-purple-900 text-sm">🪑 Masa Ayarları</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Masa Çapı (cm)</label>
              <input type="number" min={80} max={250} step={10}
                value={data.tableRadiusCm}
                onChange={e => update({ tableRadiusCm: parseInt(e.target.value) || 120 })}
                className="w-full px-2 py-1.5 border border-purple-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Masa Başı Kişi</label>
              <input type="number" min={2} max={20} step={1}
                value={data.chairsPerTable}
                onChange={e => update({ chairsPerTable: parseInt(e.target.value) || 8 })}
                className="w-full px-2 py-1.5 border border-purple-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Masalar Arası Mesafe: {data.minSpacingCm}cm</label>
            <input type="range" min={60} max={250} step={10}
              value={data.minSpacingCm}
              onChange={e => update({ minSpacingCm: parseInt(e.target.value) })}
              className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

function Step5Stage({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const positions: { id: StagePosition; label: string }[] = [
    { id: 'front',      label: '⬆️ Ön (Kuzey)' },
    { id: 'back',       label: '⬇️ Arka (Güney)' },
    { id: 'side_left',  label: '⬅️ Sol Yan' },
    { id: 'side_right', label: '➡️ Sağ Yan' },
    { id: 'center',     label: '⊕ Merkez (Arena)' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sahne Sayısı: <span className="font-bold text-orange-600">{data.stageCount}</span>
        </label>
        <div className="flex items-center gap-3">
          <button onClick={() => update({ stageCount: Math.max(0, data.stageCount - 1) })}
            className="w-10 h-10 bg-gray-100 rounded-lg font-bold text-lg hover:bg-gray-200">−</button>
          <span className="text-2xl font-bold w-8 text-center">{data.stageCount}</span>
          <button onClick={() => update({ stageCount: Math.min(4, data.stageCount + 1) })}
            className="w-10 h-10 bg-gray-100 rounded-lg font-bold text-lg hover:bg-gray-200">+</button>
        </div>
      </div>

      {data.stageCount > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sahne Konumu</label>
            <div className="grid grid-cols-2 gap-2">
              {positions.map(p => (
                <button key={p.id} onClick={() => update({ stagePosition: p.id })}
                  className={`py-2 px-3 rounded-lg text-sm border-2 transition ${
                    data.stagePosition === p.id ? 'border-orange-500 bg-orange-50 font-bold' : 'border-gray-200 hover:border-orange-300'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Sahne Uzunluğu (m)</label>
              <input type="number" min={2} max={30} step={0.5}
                value={data.stageLengthM}
                onChange={e => update({ stageLengthM: parseFloat(e.target.value) || 6 })}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Sahne Derinliği (m)</label>
              <input type="number" min={1} max={20} step={0.5}
                value={data.stageWidthM}
                onChange={e => update({ stageWidthM: parseFloat(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm" />
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-200">
          <input id="dance" type="checkbox" checked={data.hasDanceFloor}
            onChange={e => update({ hasDanceFloor: e.target.checked })}
            className="w-4 h-4 accent-pink-500" />
          <label htmlFor="dance" className="font-medium text-pink-900 text-sm">💃 Dans Pisti</label>
          {data.hasDanceFloor && (
            <input type="number" min={2} max={20} value={data.danceFloorM}
              onChange={e => update({ danceFloorM: parseFloat(e.target.value) || 5 })}
              className="ml-auto w-20 px-2 py-1 border border-pink-300 rounded text-sm" />
          )}
          {data.hasDanceFloor && <span className="text-xs text-pink-700">m (kare)</span>}
        </div>
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <input id="podium" type="checkbox" checked={data.hasPodium}
            onChange={e => update({ hasPodium: e.target.checked })}
            className="w-4 h-4 accent-blue-500" />
          <label htmlFor="podium" className="font-medium text-blue-900 text-sm">🎙️ Kürsü / Podium</label>
        </div>
      </div>
    </div>
  );
}

function Step6Service({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const Counter = ({ label, icon, value, onChange, hint }: {
    label: string; icon: string; value: number;
    onChange: (n: number) => void; hint?: string;
  }) => (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-gray-800">{icon} {label}</p>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onChange(Math.max(0, value - 1))}
            className="w-8 h-8 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">−</button>
          <span className="font-bold text-lg w-6 text-center">{value}</span>
          <button onClick={() => onChange(value + 1)}
            className="w-8 h-8 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">+</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <Counter label="Bar / Bistro" icon="🍹" value={data.bistroCount}
        onChange={n => update({ bistroCount: n })}
        hint="İçecek servisi — kenar duvarlara konumlandırılır" />
      <Counter label="Büfe Masası" icon="🍽️" value={data.buffetCount}
        onChange={n => update({ buffetCount: n })}
        hint="Yiyecek büfesi — kolaya erişim bölgelerinde" />
      <Counter label="Karşılama Masası" icon="🖥️" value={data.receptionDeskCount}
        onChange={n => update({ receptionDeskCount: n })}
        hint="Giriş noktaları — check-in ve kayıt" />

      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
        <p className="font-bold mb-1">💡 Profesyonel İpucu</p>
        <p>250 kişi başına 1 bar noktası önerilir. Giriş noktaları kalabalık bölgeden uzak tutulmalıdır.</p>
      </div>
    </div>
  );
}

function Step7Security({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const minEmergency = data.totalGuests >= 1000 ? 4 : data.totalGuests >= 200 ? 2 : 1;
  const exitOk = data.emergencyExitCount >= minEmergency;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="font-bold text-green-900 text-sm mb-3">🚪 Ana Giriş Sayısı</p>
          <div className="flex items-center gap-2">
            <button onClick={() => update({ mainEntranceCount: Math.max(1, data.mainEntranceCount - 1) })}
              className="w-8 h-8 bg-white rounded-lg border font-bold hover:bg-gray-50">−</button>
            <span className="font-bold text-xl w-8 text-center">{data.mainEntranceCount}</span>
            <button onClick={() => update({ mainEntranceCount: data.mainEntranceCount + 1 })}
              className="w-8 h-8 bg-white rounded-lg border font-bold hover:bg-gray-50">+</button>
          </div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${exitOk ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-400'}`}>
          <p className={`font-bold text-sm mb-3 ${exitOk ? 'text-green-900' : 'text-red-900'}`}>
            🆘 Acil Çıkış Sayısı
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => update({ emergencyExitCount: Math.max(1, data.emergencyExitCount - 1) })}
              className="w-8 h-8 bg-white rounded-lg border font-bold hover:bg-gray-50">−</button>
            <span className={`font-bold text-xl w-8 text-center ${exitOk ? 'text-green-700' : 'text-red-700'}`}>
              {data.emergencyExitCount}
            </span>
            <button onClick={() => update({ emergencyExitCount: data.emergencyExitCount + 1 })}
              className="w-8 h-8 bg-white rounded-lg border font-bold hover:bg-gray-50">+</button>
          </div>
        </div>
      </div>

      {!exitOk && (
        <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl text-sm text-red-800 font-medium">
          ⚠️ {data.totalGuests} kişilik etkinlik için en az {minEmergency} acil çıkış gereklidir!
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <input id="disabled" type="checkbox" checked={data.hasDisabledAccess}
          onChange={e => update({ hasDisabledAccess: e.target.checked })}
          className="w-4 h-4 accent-blue-500" />
        <label htmlFor="disabled" className="font-medium text-blue-900 text-sm">
          ♿ Engelli Erişim Rampası / Özel Alan
        </label>
      </div>

      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
        <p className="font-bold text-gray-800 mb-1">📋 Türk Yangın Yönetmeliği (TBMM 2007-12)</p>
        <ul className="space-y-1">
          <li>• &lt;200 kişi → min. 1 acil çıkış</li>
          <li>• 200–1000 kişi → min. 2 acil çıkış</li>
          <li>• 1000+ kişi → min. 4 acil çıkış</li>
          <li>• Çıkış genişliği: min. 1.2 m (ticari)</li>
        </ul>
      </div>
    </div>
  );
}

function Step8Numbering({ data, update }: { data: WizardData; update: (v: Partial<WizardData>) => void }) {
  const options: { id: NumberingType; icon: string; label: string; desc: string }[] = [
    { id: 'table_only',     icon: '1️⃣',  label: 'Sadece Masa Numarası', desc: 'T1, T2, T3 — Düğün, gala için ideal' },
    { id: 'table_and_seats',icon: '🪑',  label: 'Masa + Koltuk Numarası', desc: '1A, 1B, 2A, 2B — Tam kontrol' },
    { id: 'seats_only',     icon: '#️⃣', label: 'Sadece Koltuk Numarası', desc: '1, 2, 3 ... — Tiyatro, konser' },
    { id: 'none',           icon: '🔓',  label: 'Numarasız (Serbest)', desc: 'Herhangi bir koltuk — Kokteyl, fuar' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {options.map(o => (
          <button key={o.id} onClick={() => update({ numberingType: o.id })}
            className={`p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
              data.numberingType === o.id ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
            }`}>
            <span className="text-2xl">{o.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-800">{o.label}</p>
              <p className="text-xs text-gray-500">{o.desc}</p>
            </div>
            {data.numberingType === o.id && <Check size={18} className="text-teal-600" />}
          </button>
        ))}
      </div>

      {(data.numberingType === 'table_and_seats' || data.numberingType === 'seats_only') && (
        <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-200">
          <input id="chairNum" type="checkbox" checked={data.chairNumbering}
            onChange={e => update({ chairNumbering: e.target.checked })}
            className="w-4 h-4 accent-teal-500" />
          <label htmlFor="chairNum" className="font-medium text-teal-900 text-sm">
            🪑 Sandalye üzerinde numara göster
          </label>
        </div>
      )}

      <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-800">
        <p className="font-bold mb-1">Örnek Numara Formatı</p>
        {data.numberingType === 'table_only' && <p>Masa 1, Masa 2, Masa 3...</p>}
        {data.numberingType === 'table_and_seats' && <p>T1-A, T1-B, T1-C ... T2-A, T2-B...</p>}
        {data.numberingType === 'seats_only' && <p>1, 2, 3, 4, 5 (salon genelinde sıralı)</p>}
        {data.numberingType === 'none' && <p>Numara yok — serbest oturma</p>}
      </div>
    </div>
  );
}

function StepSummary({ data }: { data: WizardData }) {
  const cap = estimateCapacity(data);
  const minEmergency = data.totalGuests >= 1000 ? 4 : data.totalGuests >= 200 ? 2 : 1;

  const rows = [
    { label: 'Etkinlik',         value: data.eventName || '(isimsiz)',          icon: '📌' },
    { label: 'Tür',              value: data.eventType,                          icon: '🎭' },
    { label: 'Alan',             value: `${data.hallLengthM}m × ${data.hallWidthM}m = ${(data.hallLengthM * data.hallWidthM).toFixed(0)}m²`, icon: '📐' },
    { label: 'Kapasite',         value: `${data.totalGuests} kişi`,              icon: '👥' },
    { label: 'VIP',              value: data.vipEnabled ? `${data.vipCount} kişi` : 'Yok', icon: '⭐' },
    { label: 'Oturma',           value: data.seatingStyle,                       icon: '🪑' },
    { label: 'Sahne',            value: `${data.stageCount} adet (${data.stageLengthM}×${data.stageWidthM}m)`, icon: '🎤' },
    { label: 'Dans Pisti',       value: data.hasDanceFloor ? `${data.danceFloorM}m` : 'Yok', icon: '💃' },
    { label: 'Bar/Bistro',       value: `${data.bistroCount} adet`,              icon: '🍹' },
    { label: 'Büfe',             value: `${data.buffetCount} adet`,              icon: '🍽️' },
    { label: 'Acil Çıkış',       value: `${data.emergencyExitCount} (min ${minEmergency})`, icon: data.emergencyExitCount >= minEmergency ? '✅' : '⚠️' },
    { label: 'Engelli Erişim',   value: data.hasDisabledAccess ? 'Var' : 'Yok', icon: '♿' },
    { label: 'Numaralama',       value: data.numberingType,                      icon: '#️⃣' },
    { label: 'Tahmini Kapasite', value: `~${cap} kişi`,                         icon: cap >= data.totalGuests ? '✅' : '⚠️' },
  ];

  return (
    <div className="space-y-3">
      <div className={`p-4 rounded-xl border-2 ${cap >= data.totalGuests ? 'bg-green-50 border-green-400' : 'bg-amber-50 border-amber-400'}`}>
        <p className={`font-bold text-lg ${cap >= data.totalGuests ? 'text-green-800' : 'text-amber-800'}`}>
          {cap >= data.totalGuests ? '✅ Salon yeterli!' : '⚠️ Salon kapasitesi az olabilir'}
        </p>
        <p className="text-sm text-gray-700 mt-1">
          Tahmini düzen kapasitesi: <strong>{cap}</strong> kişi / İstenen: <strong>{data.totalGuests}</strong>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-gray-600">{r.icon} {r.label}</span>
            <span className="font-semibold text-gray-900">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ana Wizard Bileşeni ──────────────────────────────────────────────────────

const STEPS = [
  { title: 'Etkinlik Türü',    icon: Music,         component: Step1EventType },
  { title: 'Kapasite',         icon: Users,         component: Step2Capacity },
  { title: 'Salon Boyutları',  icon: LayoutTemplate,component: Step3Dimensions },
  { title: 'Oturma Düzeni',    icon: BookOpen,      component: Step4Seating },
  { title: 'Sahne & Performans', icon: Music,       component: Step5Stage },
  { title: 'Servis Alanları',  icon: Utensils,      component: Step6Service },
  { title: 'Güvenlik & Çıkış', icon: Shield,        component: Step7Security },
  { title: 'Numaralama',       icon: Hash,          component: Step8Numbering },
  { title: 'Özet & Oluştur',   icon: Check,         component: StepSummary },
];

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);

  const update = (patch: Partial<WizardData>) => setData(prev => ({ ...prev, ...patch }));

  const CurrentStepComponent = STEPS[step].component as React.ComponentType<{ data: WizardData; update: (v: Partial<WizardData>) => void }>;

  function buildConfig() {
    return {
      hallLengthM:   data.hallLengthM,
      hallWidthM:    data.hallWidthM,
      tableRadiusCm: data.tableRadiusCm || 120,
      chairsPerTable: data.chairsPerTable,
      tableCount:    0,
      minSpacingCm:  data.minSpacingCm,
      stageLengthM:  data.stageLengthM,
      stageWidthM:   data.stageWidthM,
      stageCount:    data.stageCount,
      stageCapacity: 0,
      bistroCount:   data.bistroCount,
      buffetCount:   data.buffetCount,
      receptionDeskCount: data.receptionDeskCount,
      mainEntranceCount:  data.mainEntranceCount,
      emergencyExitCount: data.emergencyExitCount,
      hasDisabledAccess:  data.hasDisabledAccess,
      hasDanceFloor:  data.hasDanceFloor,
      danceFloorM:    data.danceFloorM,
      hasPodium:      data.hasPodium,
      stagePosition:  data.stagePosition,
      numberingType:  data.numberingType,
      chairNumbering: data.chairNumbering,
      totalCapacity:  Math.min(data.totalGuests, 2000),
      vipEnabled:     data.vipEnabled,
      vipCount:       data.vipCount,
      eventType:      data.eventType,
      eventName:      data.eventName,
      seatingStyle:   data.seatingStyle,
    };
  }

  function handleGenerate() {
    const config = buildConfig();
    localStorage.setItem('autoGenerateConfig', JSON.stringify(config));
    router.push('/admin/designer/generate');
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => router.push('/admin/designer')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft size={16} /> Geri
        </button>
        <div className="text-center">
          <h1 className="font-bold text-gray-900">🎪 Salon Tasarım Sihirbazı</h1>
          <p className="text-xs text-gray-500">Adım {step + 1} / {STEPS.length}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex gap-1 mb-2">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => i <= step && setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < step ? 'bg-blue-600 cursor-pointer' :
                i === step ? 'bg-blue-400' : 'bg-gray-200'
              }`} />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <button key={i} onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                  i === step ? 'bg-blue-100 text-blue-700' :
                  i < step ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' :
                  'text-gray-400'
                }`}>
                {i < step ? <Check size={12} /> : <Icon size={12} />}
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex justify-center py-8 px-4">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              {(() => { const Icon = STEPS[step].icon; return <Icon size={22} className="text-blue-600" />; })()}
              {STEPS[step].title}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {step === 0 && 'Etkinlik türünü seçin — sistem akıllı varsayılanları otomatik ayarlar'}
              {step === 1 && 'Kaç kişi katılacak? VIP alan gerekiyor mu?'}
              {step === 2 && 'Salon fiziksel boyutlarını girin. Sistem kapasiteyi kontrol eder.'}
              {step === 3 && 'Misafirlerin nasıl oturacağını belirleyin'}
              {step === 4 && 'Sahne, dans pisti ve kürsü konumlarını planlayın'}
              {step === 5 && 'Servis noktaları ve ikram alanlarını tanımlayın'}
              {step === 6 && 'Güvenlik ve çıkış noktalarını belirleyin (yasal zorunluluk)'}
              {step === 7 && 'Bilet ve koltuk numaralama sistemini seçin'}
              {step === 8 && 'Her şey hazır! Tasarımı oluşturmak için "Oluştur" butonuna tıklayın.'}
            </p>
            <CurrentStepComponent data={data} update={update} />
          </div>

          {/* Nav Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition">
                <ArrowLeft size={18} /> Geri
              </button>
            )}
            {!isLast ? (
              <button onClick={() => setStep(step + 1)}
                className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition shadow-md">
                İleri <ArrowRight size={18} />
              </button>
            ) : (
              <button onClick={handleGenerate}
                className="flex-1 px-5 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl flex items-center justify-center gap-2 transition text-base">
                <Zap size={20} /> Salonu Oluştur & Düzenleyiciyi Aç
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
