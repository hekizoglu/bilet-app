"use client";
import dynamic from 'next/dynamic';

// Konva kütüphanesi window objesi aradığı için SSR (Server Side Rendering) kapatılır.
const HallDesignerCanvas = dynamic(() => import('../../../components/HallDesignerCanvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">Tasarımcı yükleniyor...</div>
});

export default function DesignerPage() {
  return (
    <div className="flex gap-6">
      {/* Sol Panel - Alan Bilgileri */}
      <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-lg p-6 max-h-screen overflow-y-auto sticky top-0">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>📐</span> Alan Bilgileri
        </h2>

        {/* Form */}
        <HallSettingsPanel />
      </div>

      {/* Sağ Taraf - Tasarımcı */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salon Tasarımcısı</h1>
          <p className="text-gray-500 mt-2">
            Etkinlikleriniz için oturma planlarını sürükle-bırak ile hazırlayın.
          </p>
        </div>

        <HallDesignerCanvas />
      </div>
    </div>
  );
}

function HallSettingsPanel() {
  const [hallDimensions, setHallDimensions] = useState({ width: 1000, height: 800 });
  const [tableSize, setTableSize] = useState({ radius: 40 });
  const [chairSize, setChairSize] = useState({ width: 30, height: 30 });
  const [spacing, setSpacing] = useState(180);
  const [standingCapacity, setStandingCapacity] = useState(150);
  const [numberingType, setNumberingType] = useState<'table_only' | 'table_and_seats' | 'seats_only' | 'none'>('table_and_seats');

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

      {/* Masa Boyutu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Masa Çapı: {tableSize.radius * 2}px
        </label>
        <input
          type="range"
          min="20"
          max="60"
          value={tableSize.radius}
          onChange={(e) => setTableSize({ radius: parseInt(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">Standart: 80px</p>
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
        onClick={() => {/* Auto-generate trigger */}}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
      >
        <span>⚡</span> Otomatik Oluştur
      </button>

      <p className="text-xs text-gray-500 text-center">
        Sahne üstte, masalar alt kısımda otomatik dizilir
      </p>
    </div>
  );
}
