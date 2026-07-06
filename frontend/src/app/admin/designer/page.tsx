"use client";
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HallSettingsPanel } from '../../../components/HallSettingsPanel';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

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
  const canvasRef = useRef<{ autoGenerateLayout: (c: AutoGenerateConfig) => void } | null>(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);

  const handleAutoGenerate = (config: AutoGenerateConfig) => {
    if (canvasRef.current?.autoGenerateLayout) {
      canvasRef.current.autoGenerateLayout(config);
    }
    setIsCanvasModalOpen(true);
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
        title={isSettingsPanelOpen ? 'Paneli Gizle' : 'Paneli Ac'}
      >
        {isSettingsPanelOpen ? (
          <ChevronLeft size={20} className="text-gray-600" />
        ) : (
          <ChevronRight size={20} className="text-gray-600" />
        )}
      </button>

      {/* Ana Alan - Başlık + Placeholder */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="p-8 border-b border-gray-200 bg-white">
          <h1 className="text-4xl font-bold text-gray-900">🎪 Salon Tasarımcısı</h1>
            <p className="text-gray-600 mt-3">
              Salon ayarlarını sol panelden düzenleyin. &ldquo;🎯 Tasarımcıyı Aç&rdquo; butonuna tıklayarak tasarımcı penceresini açın.
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Maximize2 size={64} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-6">
                {isCanvasModalOpen ? 'Tasarımcı penceresi açılıyor...' : 'Başlamak için Tasarımcıyı Aç butonuna tıklayın'}
              </p>
              <button
                onClick={() => setIsCanvasModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                🎯 Tasarımcıyı Aç
              </button>
          </div>
        </div>
      </div>

      {/* Modal - Canvas Penceresi */}
      {isCanvasModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-2xl font-bold text-white">🎪 Salon Tasarımcısı - Düzen Planlayıcısı</h2>
              <button
                onClick={() => setIsCanvasModalOpen(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            {/* Modal Content - Canvas */}
            <div className="flex-1 overflow-auto">
              <HallDesignerCanvas ref={canvasRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
