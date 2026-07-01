"use client";
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HallSettingsPanel } from '../../../components/HallSettingsPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

// Konva kütüphanesi window objesi aradığı için SSR (Server Side Rendering) kapatılır.
const HallDesignerCanvas = dynamic(() => import('../../../components/HallDesignerCanvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">Tasarımcı yükleniyor...</div>
});

export default function DesignerPage() {
  const canvasRef = useRef<any>(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);

  const handleAutoGenerate = (config: AutoGenerateConfig) => {
    if (canvasRef.current?.autoGenerateLayout) {
      canvasRef.current.autoGenerateLayout(config);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sol Panel - Alan Bilgileri (Collapsible) */}
      <div 
        className={`flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col ${
          isSettingsPanelOpen ? 'w-96' : 'w-0'
        }`}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>📐</span> Alan Bilgileri
          </h2>
          <HallSettingsPanel onAutoGenerate={handleAutoGenerate} />
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
        className="flex-shrink-0 w-10 bg-white border-r border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
        title={isSettingsPanelOpen ? 'Paneli Gizle' : 'Paneli Aç'}
      >
        {isSettingsPanelOpen ? (
          <ChevronLeft size={20} className="text-gray-600" />
        ) : (
          <ChevronRight size={20} className="text-gray-600" />
        )}
      </button>

      {/* Sağ Taraf - Tasarımcı (Full Width) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-white">
          <h1 className="text-3xl font-bold text-gray-900">🎪 Salon Tasarımcısı</h1>
          <p className="text-gray-500 mt-1">
            Etkinlikleriniz için oturma planlarını sürükle-bırak ile hazırlayın. 
            {isSettingsPanelOpen ? ' Ayarları sol panelden değiştirebilirsiniz.' : ' Paneli açmak için ◀ butonuna tıklayın.'}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <HallDesignerCanvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
