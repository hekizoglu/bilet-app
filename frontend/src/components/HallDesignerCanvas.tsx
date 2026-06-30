"use client";

import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, Save, Plus } from 'lucide-react';

export default function HallDesignerCanvas() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hallId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [chairs, setChairs] = useState<{id: string, x: number, y: number}[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Snap to Grid (Fikir #5)
  const SNAP_GRID = 20;

  useEffect(() => {
    if (hallId) {
      fetchHall(hallId);
    }
  }, [hallId]);

  const fetchHall = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/halls/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || '');
        setIsGlobal(data.isGlobal || false);
        if (data.layoutJson) {
          const layout = JSON.parse(data.layoutJson);
          setChairs(layout.chairs || []);
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
    
    // Konva elementini fiziksel olarak da snap pozisyonuna çek
    e.target.position({ x: newX, y: newY });
    
    setChairs(chairs.map(c => c.id === id ? { ...c, x: newX, y: newY } : c));
  };

  const addChair = () => {
    const newChair = { id: `C-${Date.now()}`, x: 100, y: 100 };
    setChairs([...chairs, newChair]);
    setSelectedId(newChair.id);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setChairs(chairs.filter(c => c.id !== selectedId));
      setSelectedId(null);
    }
  };

  const saveLayout = async () => {
    if (!name.trim()) {
      alert("Lütfen salon adı giriniz.");
      return;
    }

    const token = getCookie('token');
    const layoutJson = JSON.stringify({ chairs });
    const payload = {
      name,
      description,
      seatCount: chairs.length,
      layoutJson,
      isGlobal
    };

    try {
      const url = hallId 
        ? `http://localhost:5000/api/halls/${hallId}` 
        : 'http://localhost:5000/api/halls';
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

  return (
    <div className="flex gap-6">
      {/* Sol Panel: Araçlar ve Form */}
      <div className="w-80 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Salon Bilgileri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salon Adı</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Ana Salon"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isGlobal} 
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                />
                Küresel Şablon (Herkes seçebilir)
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tasarım Araçları</h2>
          <div className="flex flex-col gap-3">
            <button 
              onClick={addChair} 
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              <Plus size={18} />
              Koltuk Ekle
            </button>
            <button 
              onClick={deleteSelected} 
              disabled={!selectedId}
              className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                selectedId ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={18} />
              Seçili Koltuğu Sil
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Toplam Koltuk: <span className="font-bold text-gray-800">{chairs.length}</span>
            </p>
          </div>
        </div>

        <div className="mt-auto border-t border-gray-100 pt-6">
          <button 
            onClick={saveLayout} 
            className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <Save size={20} />
            {hallId ? 'Güncelle' : 'Salonu Kaydet'}
          </button>
        </div>
      </div>
      
      {/* Sağ Panel: Canvas */}
      <div 
        className="flex-1 bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200 relative"
        onClick={(e) => {
          // Eğer canvas boşluğuna tıklandıysa seçimi kaldır
          if (e.target === e.currentTarget) {
            setSelectedId(null);
          }
        }}
      >
        <Stage 
          width={800} 
          height={600} 
          onMouseDown={(e) => {
            // Eğer sahnenin kendisine (arka plana) tıklandıysa seçimi kaldır
            if (e.target === e.target.getStage()) {
              setSelectedId(null);
            }
          }}
        >
          <Layer>
            {chairs.map(chair => {
              const isSelected = chair.id === selectedId;
              return (
                <Group
                  key={chair.id}
                  x={chair.x}
                  y={chair.y}
                  draggable
                  onDragStart={() => setSelectedId(chair.id)}
                  onDragEnd={(e) => handleDragEnd(e, chair.id)}
                  onClick={() => setSelectedId(chair.id)}
                  onTap={() => setSelectedId(chair.id)}
                >
                  <Rect 
                    width={40} 
                    height={40} 
                    fill={isSelected ? "#4338ca" : "#4f46e5"} 
                    cornerRadius={6}
                    stroke={isSelected ? "#fbbf24" : "transparent"}
                    strokeWidth={isSelected ? 3 : 0}
                    shadowColor="rgba(0,0,0,0.2)"
                    shadowBlur={5}
                    shadowOffset={{ x: 0, y: 2 }}
                    shadowOpacity={isSelected ? 0.6 : 0.3}
                  />
                  <Text 
                    text={chair.id.split('-')[1].slice(-3)} 
                    x={5} 
                    y={15} 
                    fill="white" 
                    fontSize={12} 
                    fontStyle="bold" 
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
        
        {/* Grid Background Effect (CSS ile) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
            backgroundSize: `${SNAP_GRID}px ${SNAP_GRID}px`
          }}
        />
      </div>
    </div>
  );
}
