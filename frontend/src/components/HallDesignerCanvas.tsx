"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage } from 'react-konva';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, Save, Plus, Settings, Copy, MousePointer2, Image as ImageIcon } from 'lucide-react';

type ElementType = "round_table" | "rect_table" | "bistro" | "chair" | "stage";
type NumberingType = "table_only" | "table_and_seats" | "seats_only" | "none";

interface DesignerElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  radius?: number; 
  rotation?: number; 
  seatCount?: number; 
  numberingType?: NumberingType;
}

interface HallLayout {
  canvas: { width: number; height: number };
  elements: DesignerElement[];
}

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

interface HallDesignerCanvasProps {
  onAutoGenerate?: (config: AutoGenerateConfig) => void;
}

export default function HallDesignerCanvas() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hallId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  
  const [elements, setElements] = useState<DesignerElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Arka plan görseli
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  const SNAP_GRID = 10;

  useEffect(() => {
    if (hallId) fetchHall(hallId);
  }, [hallId]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
      img.onerror = () => setBgImageObj(null);
    } else {
      setBgImageObj(null);
    }
  }, [backgroundImage]);

  const fetchHall = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/halls/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || '');
        setAddress(data.address || '');
        setIsGlobal(data.isGlobal || false);
        setBackgroundImage(data.backgroundImage || '');
        if (data.layoutJson) {
          try {
            const layout = JSON.parse(data.layoutJson) as HallLayout;
            if (layout.elements) {
              setElements(layout.elements);
            } else {
              // Geriye dönük uyumluluk (eski chairs dizisi)
              const oldChairs = JSON.parse(data.layoutJson).chairs || [];
              setElements(oldChairs.map((c: any) => ({
                id: c.id,
                type: 'chair',
                label: c.id.split('-')[1].slice(-3),
                x: c.x,
                y: c.y,
                numberingType: 'seats_only'
              })));
            }
          } catch (e) {
            console.error("Layout parse error", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleDragEnd = (e: any, id: string) => {
    const newX = Math.round(e.target.x() / SNAP_GRID) * SNAP_GRID;
    const newY = Math.round(e.target.y() / SNAP_GRID) * SNAP_GRID;
    e.target.position({ x: newX, y: newY });
    setElements(elements.map(el => el.id === id ? { ...el, x: newX, y: newY } : el));
  };

  const addElement = (type: ElementType) => {
    const id = `${type}-${Date.now()}`;
    const baseElement: DesignerElement = {
      id,
      type,
      label: type === 'round_table' ? 'Masa' : type === 'stage' ? 'Sahne' : type === 'bistro' ? 'Bistro' : 'Obje',
      x: 100,
      y: 100,
      rotation: 0
    };

    if (type === 'round_table') {
      baseElement.radius = 40;
      baseElement.seatCount = 8;
      baseElement.numberingType = 'table_and_seats';
    } else if (type === 'rect_table') {
      baseElement.width = 120;
      baseElement.height = 60;
      baseElement.seatCount = 6;
      baseElement.numberingType = 'table_and_seats';
    } else if (type === 'chair') {
      baseElement.width = 30;
      baseElement.height = 30;
      baseElement.numberingType = 'seats_only';
      baseElement.label = 'Koltuk';
    } else if (type === 'bistro') {
      baseElement.radius = 25;
      baseElement.seatCount = 4;
      baseElement.numberingType = 'table_only';
    } else if (type === 'stage') {
      baseElement.width = 200;
      baseElement.height = 80;
      baseElement.numberingType = 'none';
    }

    setElements([...elements, baseElement]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(e => e.id !== selectedId));
      setSelectedId(null);
    }
  };

  const duplicateSelected = () => {
    if (selectedId) {
      const target = elements.find(e => e.id === selectedId);
      if (target) {
        const newEl = { ...target, id: `${target.type}-${Date.now()}`, x: target.x + 20, y: target.y + 20 };
        setElements([...elements, newEl]);
        setSelectedId(newEl.id);
      }
    }
  };

  const updateSelected = (key: keyof DesignerElement, value: any) => {
    if (selectedId) {
      setElements(elements.map(e => e.id === selectedId ? { ...e, [key]: value } : e));
    }
  };

  const getTotalSeats = () => {
    return elements.reduce((acc, el) => {
      if (el.type === 'stage') return acc;
      return acc + (el.seatCount || 1);
    }, 0);
  };

  // 🎭 Otomatik Sahne Oluştur - Detailed Config
  const autoGenerateLayout = (config: AutoGenerateConfig) => {
    // 📐 Dönüşüm: 1 metre = 80 pixel (ölçeklendirilmiş görünüm)
    const PIXEL_PER_METER = 80;
    const CANVAS_WIDTH = config.hallLengthM * PIXEL_PER_METER;
    const CANVAS_HEIGHT = config.hallWidthM * PIXEL_PER_METER;
    
    // Masa ölçüleri: santimetre → pixel
    const TABLE_RADIUS = (config.tableRadiusCm / 100) * PIXEL_PER_METER / 2; // cm to m to pixels
    const TABLE_SEATS = config.chairsPerTable;
    const MIN_SPACING = (config.minSpacingCm / 100) * PIXEL_PER_METER; // cm to m to pixels
    
    // Sahne ölçüleri
    const STAGE_WIDTH = config.stageLengthM * PIXEL_PER_METER;
    const STAGE_HEIGHT = config.stageWidthM * PIXEL_PER_METER;
    let STAGE_CAPACITY = Math.min(config.stageCapacity, 2000); // ⚠️ MAX 2000 CAP

    // 🎯 KAPASİTE KONTROLÜ
    const MAX_TOTAL_CAPACITY = 2000;
    const MAX_SEATED_CAPACITY = MAX_TOTAL_CAPACITY - STAGE_CAPACITY;

    const newElements: DesignerElement[] = [];

    // 1️⃣ SAHNE YERLEŞTIR (Üstte, Orta)
    if (STAGE_CAPACITY > 0) {
      newElements.push({
        id: `stage-${Date.now()}`,
        type: 'stage',
        label: `Sahne (${STAGE_CAPACITY} kişi)`,
        x: (CANVAS_WIDTH - STAGE_WIDTH) / 2,
        y: 30,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        rotation: 0,
        seatCount: STAGE_CAPACITY,
        numberingType: 'none'
      });
    }

    // 2️⃣ MASALARI GRID'DE YERLEŞTIR
    // Sahne sonrası boş alan
    const AVAILABLE_HEIGHT = CANVAS_HEIGHT - (STAGE_HEIGHT + 60);
    const AVAILABLE_WIDTH = CANVAS_WIDTH - 100;

    // Grid hesapla: Masalar + spacing
    const TABLE_DIAMETER = TABLE_RADIUS * 2;
    let COLS = Math.max(1, Math.floor(AVAILABLE_WIDTH / (TABLE_DIAMETER + MIN_SPACING)));
    let ROWS = Math.max(1, Math.floor(AVAILABLE_HEIGHT / (TABLE_DIAMETER + MIN_SPACING)));

    // 🎯 KAPASİTE LIMITI: Masa sayısını kapasiteye göre ayarla
    const maxTablesForCapacity = Math.floor(MAX_SEATED_CAPACITY / TABLE_SEATS);
    const calculatedTotalTables = COLS * ROWS;

    if (calculatedTotalTables * TABLE_SEATS > MAX_SEATED_CAPACITY) {
      // Kapasiteyi aşıyorsa, satır sayısını kırp
      ROWS = Math.max(1, Math.floor(maxTablesForCapacity / COLS));
    }

    let tableCount = 0;
    const startX = 50;
    const startY = STAGE_HEIGHT + 80;
    let totalSeatedCapacity = 0;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // ⚠️ Kapasiteyi aşacaksa masa ekleme
        if (totalSeatedCapacity + TABLE_SEATS > MAX_SEATED_CAPACITY) {
          break;
        }

        const x = startX + col * (TABLE_DIAMETER + MIN_SPACING);
        const y = startY + row * (TABLE_DIAMETER + MIN_SPACING);

        // Canvas sınırlarını kontrol et
        if (x + TABLE_RADIUS > CANVAS_WIDTH - 30 || y + TABLE_RADIUS > CANVAS_HEIGHT - 30) {
          continue;
        }

        tableCount++;
        totalSeatedCapacity += TABLE_SEATS;
        newElements.push({
          id: `round_table-${Date.now()}-${tableCount}`,
          type: 'round_table',
          label: `T${tableCount}`,
          x,
          y,
          radius: TABLE_RADIUS,
          rotation: 0,
          seatCount: TABLE_SEATS,
          numberingType: config.numberingType
        });
      }
      // Kapasite limitini aştıysa satırları da kes
      if (totalSeatedCapacity + TABLE_SEATS > MAX_SEATED_CAPACITY) {
        break;
      }
    }

    // Tüm elemanları güncelle
    setElements(newElements);
    setSelectedId(null);
    
    const totalCapacity = totalSeatedCapacity + STAGE_CAPACITY;
    alert(`✅ Salon Oluşturuldu!
📊 Bilgiler:
• Alan: ${config.hallLengthM}m × ${config.hallWidthM}m (${(config.hallLengthM * config.hallWidthM).toFixed(1)}m²)
• Masa Sayısı: ${tableCount}
• Oturan Kapasite: ${totalSeatedCapacity} kişi
• Sahne Kapasitesi: ${STAGE_CAPACITY} kişi
• ⭐ TOPLAM KAPASİTE: ${totalCapacity} kişi / 2000 max
${totalCapacity === 2000 ? '🔴 (Maksimum Kapasite)' : `🟢 (${2000 - totalCapacity} kişi yer var)`}`);
  };

  // 📊 İstatistik Hesaplayıcı
  const getStatistics = () => {
    const tables = elements.filter(e => e.type !== 'stage' && e.type !== 'chair');
    const chairs = elements.filter(e => e.type === 'chair');
    const stages = elements.filter(e => e.type === 'stage');
    const totalSeats = getTotalSeats();

    return {
      tables: tables.length,
      chairs: chairs.length,
      stages: stages.length,
      totalSeats,
      avgSeatsPerTable: tables.length > 0 ? Math.round(tables.reduce((acc, t) => acc + (t.seatCount || 1), 0) / tables.length) : 0
    };
  };

  const saveLayout = async () => {
    if (!name.trim()) {
      alert("Lütfen salon adı giriniz.");
      return;
    }

    const token = getCookie('token');
    
    const payload = {
      name,
      description,
      address,
      seatCount: elements.reduce((acc, el) => acc + (el.seatCount || 1), 0),
      layoutJson: JSON.stringify({ canvas: { width: 1000, height: 600 }, elements }),
      backgroundImage,
      isGlobal
    };

    try {
      const url = hallId ? `http://localhost:5000/api/halls/${hallId}` : 'http://localhost:5000/api/halls';
      const method = hallId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Kayıt Başarılı!");
        router.push('/admin/halls');
      } else {
        const errData = await res.json();
        alert(`Hata: ${errData.error || errData.details}`);
      }
    } catch (e) {
      console.error(e);
      alert("Sunucuya ulaşılamadı.");
    }
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  // --- Çizim Yardımcı Fonksiyonları ---
  const renderRoundTable = (el: DesignerElement, isSelected: boolean) => {
    const r = el.radius || 40;
    const sCount = el.seatCount || 8;
    const seats = [];
    
    for(let i=0; i<sCount; i++) {
      const angle = (i * (360 / sCount)) * (Math.PI / 180);
      const sx = Math.cos(angle) * (r + 15);
      const sy = Math.sin(angle) * (r + 15);
      seats.push(
        <Circle key={`seat-${i}`} x={sx} y={sy} radius={10} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} />
      );
    }

    return (
      <Group>
        {seats}
        <Circle radius={r} fill="white" stroke={isSelected ? "#4f46e5" : "#cbd5e1"} strokeWidth={isSelected ? 3 : 2} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" />
      </Group>
    );
  };

  const renderRectTable = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 120;
    const h = el.height || 60;
    const sCount = el.seatCount || 6;
    
    // Basit dağılım: Uzun kenarlara sandalyeler dizilir (örnek amaçlı alt/üst)
    const seats = [];
    const topBottomCount = Math.floor(sCount / 2);
    const spacing = w / (topBottomCount + 1);
    
    for(let i=0; i<topBottomCount; i++) {
      seats.push(<Rect key={`t-${i}`} x={spacing * (i+1) - 10} y={-25} width={20} height={20} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} cornerRadius={4} />);
      seats.push(<Rect key={`b-${i}`} x={spacing * (i+1) - 10} y={h + 5} width={20} height={20} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} cornerRadius={4} />);
    }

    return (
      <Group>
        {seats}
        <Rect width={w} height={h} fill="white" stroke={isSelected ? "#4f46e5" : "#cbd5e1"} strokeWidth={isSelected ? 3 : 2} cornerRadius={4} />
        <Text text={el.label} width={w} y={h/2 - 7} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" />
      </Group>
    );
  };

  const renderStage = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 200;
    const h = el.height || 80;
    return (
      <Group>
        <Rect width={w} height={h} fill="#1e293b" stroke={isSelected ? "#fbbf24" : "transparent"} strokeWidth={3} cornerRadius={8} />
        <Text text={el.label} width={w} y={h/2 - 10} align="center" fontSize={18} fill="white" fontStyle="bold" />
      </Group>
    );
  };

  const renderBistro = (el: DesignerElement, isSelected: boolean) => {
    const r = el.radius || 25;
    return (
      <Group>
        <Circle radius={r} fill="#fef3c7" stroke={isSelected ? "#d97706" : "#fcd34d"} strokeWidth={isSelected ? 3 : 2} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={12} fill="#92400e" fontStyle="bold" />
      </Group>
    );
  };

  const renderChair = (el: DesignerElement, isSelected: boolean) => {
    return (
      <Group>
        <Rect width={30} height={30} fill={isSelected ? "#4f46e5" : "#cbd5e1"} cornerRadius={4} shadowColor="rgba(0,0,0,0.2)" shadowBlur={2} shadowOffsetY={2} />
        <Text text={el.label} width={30} y={10} align="center" fontSize={10} fill={isSelected ? "white" : "#1e293b"} />
      </Group>
    );
  };

  return (
    <div className="flex gap-6 h-[800px]">
      {/* Sol Panel: Araçlar ve Form */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Salon Ayarları</h2>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salon Adı</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Açık Adres</label>
              <textarea 
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Google Haritalar QR kodu için açık adres giriniz..."
                className="w-full p-2 border border-gray-300 rounded text-sm h-20 resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kroki / Arkaplan Resmi URL</label>
              <div className="flex gap-2">
                <input type="text" value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} placeholder="https://..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          {/* Ekleme Butonları */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Eleman Ekle</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addElement('round_table')} className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded border border-gray-200 font-medium text-gray-700">Yuvarlak Masa</button>
              <button onClick={() => addElement('rect_table')} className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded border border-gray-200 font-medium text-gray-700">Dikdörtgen Masa</button>
              <button onClick={() => addElement('bistro')} className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded border border-gray-200 font-medium text-gray-700">Bistro Masa</button>
              <button onClick={() => addElement('chair')} className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded border border-gray-200 font-medium text-gray-700">Tekli Sandalye</button>
              <button onClick={() => addElement('stage')} className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded border border-gray-200 font-medium text-gray-700 col-span-2">Sahne / Alan</button>
            </div>
          </div>

          {/* 🎭 Otomatik Oluştur */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
            <h3 className="text-sm font-bold text-purple-900 mb-2">⚡ Otomatik Sahne Oluştur</h3>
            <p className="text-xs text-purple-700 mb-3">Masaları grid pattern'de otomatik yerleştir</p>
            <button 
              onClick={autoGenerateLayout}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition shadow-md"
            >
              ✨ Otomatik Yerleştir
            </button>
          </div>

          {/* 📊 İstatistikler */}
          {(() => {
            const stats = getStatistics();
            return (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                <h3 className="text-sm font-bold text-green-900 mb-3 border-b pb-2">📊 Salon İstatistikleri</h3>
                <div className="space-y-2 text-xs text-green-800">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">🪑 Masa Sayısı:</span>
                    <span className="bg-white px-2 py-1 rounded font-bold text-green-700">{stats.tables}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">🪑 Tekli Sandalye:</span>
                    <span className="bg-white px-2 py-1 rounded font-bold text-green-700">{stats.chairs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">🎤 Sahne/Alan:</span>
                    <span className="bg-white px-2 py-1 rounded font-bold text-green-700">{stats.stages}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 mt-2 flex justify-between items-center">
                    <span className="font-bold">Toplam Kapasite:</span>
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full font-bold">{stats.totalSeats} 👥</span>
                  </div>
                  {stats.tables > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium">Masa başı ort.:</span>
                      <span className="bg-white px-2 py-1 rounded">{stats.avgSeatsPerTable} kişi</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Özellikler Paneli */}
          {selectedElement && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
              <h3 className="text-sm font-bold text-blue-900 flex justify-between items-center">
                Seçili Öğe
                <div className="flex gap-1">
                  <button onClick={duplicateSelected} className="p-1 hover:bg-blue-200 rounded text-blue-700" title="Çoğalt"><Copy size={14}/></button>
                  <button onClick={deleteSelected} className="p-1 hover:bg-red-200 rounded text-red-600" title="Sil"><Trash2 size={14}/></button>
                </div>
              </h3>
              
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Etiket / İsim</label>
                <input type="text" value={selectedElement.label} onChange={(e) => updateSelected('label', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white" />
              </div>

              {selectedElement.type !== 'stage' && (
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">Kapasite (Kişi)</label>
                  <input type="number" min="1" value={selectedElement.seatCount || 1} onChange={(e) => updateSelected('seatCount', parseInt(e.target.value))} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white" />
                </div>
              )}

              {selectedElement.type !== 'stage' && selectedElement.type !== 'chair' && (
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">Numaralandırma Tipi</label>
                  <select value={selectedElement.numberingType || 'table_and_seats'} onChange={(e) => updateSelected('numberingType', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white">
                    <option value="table_and_seats">Masa ve Koltuklar Numaralı</option>
                    <option value="table_only">Sadece Masa Numaralı (Koltuksuz/Serbest)</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Masalar</p>
              <p className="font-bold text-lg text-gray-800">{getStatistics().tables}</p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-gray-500">Kapasite</p>
              <p className="font-bold text-lg text-blue-600">{getTotalSeats()}</p>
            </div>
          </div>
          <button onClick={saveLayout} className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition">
            <Save size={18} /> {hallId ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
      
      {/* Sağ Panel: Canvas */}
      <div 
        className="flex-1 bg-gray-200 rounded-xl overflow-hidden shadow-inner border border-gray-300 relative"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
      >
        <Stage 
          width={1000} 
          height={800} 
          onMouseDown={(e) => {
            if (e.target === e.target.getStage() || e.target.name() === 'bgImage') setSelectedId(null);
          }}
        >
          <Layer>
            {/* Arka Plan Kroki */}
            {bgImageObj && (
              <KonvaImage image={bgImageObj} x={0} y={0} width={1000} height={800} opacity={0.5} name="bgImage" />
            )}

            {/* Elemanlar */}
            {elements.map(el => {
              const isSelected = el.id === selectedId;
              return (
                <Group
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  rotation={el.rotation || 0}
                  draggable
                  onDragStart={() => setSelectedId(el.id)}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onClick={() => setSelectedId(el.id)}
                  onTap={() => setSelectedId(el.id)}
                >
                  {el.type === 'round_table' && renderRoundTable(el, isSelected)}
                  {el.type === 'rect_table' && renderRectTable(el, isSelected)}
                  {el.type === 'stage' && renderStage(el, isSelected)}
                  {el.type === 'bistro' && renderBistro(el, isSelected)}
                  {el.type === 'chair' && renderChair(el, isSelected)}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
