"use client";
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HallSettingsPanel } from '../../../components/HallSettingsPanel';
import { ChevronLeft, ChevronRight, X, Wand2, Palette, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

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

const HallDesignerCanvas = dynamic(() => import('../../../components/HallDesignerCanvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">Tasarımcı yükleniyor...</div>
});

export default function DesignerPage() {
  const canvasRef = useRef<{ autoGenerateLayout: (c: AutoGenerateConfig) => void } | null>(null);
  
  // 'landing' | 'wizard' | 'canvas'
  const [viewMode, setViewMode] = useState<'landing' | 'wizard' | 'canvas'>('landing');
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);

  const handleAutoGenerate = (config: AutoGenerateConfig) => {
    if (canvasRef.current?.autoGenerateLayout) {
      canvasRef.current.autoGenerateLayout(config);
    }
    setIsCanvasModalOpen(true);
  };

  const openEmptyCanvas = () => {
    setViewMode('canvas');
  };

  // 1. LANDING SCREEN
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">🎪 Salon Tasarımcısı</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Etkinliğinizin oturma düzenini nasıl oluşturmak istersiniz? Hızlı bir başlangıç için sihirbazı kullanabilir veya kendi düzeninizi sıfırdan çizebilirsiniz.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
          {/* SİHİRBAZ İLE OLUŞTUR */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('wizard')}
            className="bg-white rounded-3xl p-8 shadow-xl border border-blue-100 cursor-pointer flex flex-col items-center text-center group hover:shadow-blue-200/50 transition-all"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <Wand2 size={40} className="text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">🪄 Sihirbaz ile Hızlı Oluştur</h2>
            <p className="text-slate-500 mb-6 flex-1">
              Salon ölçülerini, masa büyüklüğünü ve sahne kapasitesini girin; sistem sizin için saniyeler içinde optimum oturma düzenini otomatik çizsin.
            </p>
            <span className="text-blue-600 font-semibold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              Sihirbazı Başlat <ChevronRight size={18} />
            </span>
          </motion.div>

          {/* SİHİRBAZSIZ (BOŞ TUVAL) */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={openEmptyCanvas}
            className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-100 cursor-pointer flex flex-col items-center text-center group hover:shadow-indigo-200/50 transition-all"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
              <Palette size={40} className="text-indigo-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">🎨 Boş Tuvalden Başla</h2>
            <p className="text-slate-500 mb-6 flex-1">
              Hiçbir otomatik yerleşim olmadan, bomboş bir alanda masaları, sandalyeleri ve kapıları tek tek kendi zevkinize göre yerleştirin.
            </p>
            <span className="text-indigo-600 font-semibold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              Tuvali Aç <ChevronRight size={18} />
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  // 2. WIZARD MODE (Mevcut Görünüm)
  if (viewMode === 'wizard') {
    return (
      <div className="flex h-screen bg-gray-50">
        <div 
          className={`flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col ${
            isSettingsPanelOpen ? 'w-96' : 'w-0'
          }`}
        >
          <div className="p-4 border-b flex items-center gap-3 bg-slate-50">
            <button onClick={() => setViewMode('landing')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>🪄</span> Sihirbaz
            </h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <HallSettingsPanel onAutoGenerate={handleAutoGenerate} />
          </div>
        </div>

        <button
          onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
          className="flex-shrink-0 w-10 bg-white border-r border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
          title={isSettingsPanelOpen ? 'Paneli Gizle' : 'Paneli Aç'}
        >
          {isSettingsPanelOpen ? <ChevronLeft size={20} className="text-gray-600" /> : <ChevronRight size={20} className="text-gray-600" />}
        </button>

        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Wand2 size={64} className="text-blue-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-6">
                {isCanvasModalOpen ? 'Tasarımcı penceresi açılıyor...' : 'Sol panelden ayarları yapıp oluştur butonuna tıklayın.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal - Canvas Penceresi (Wizard Modu) */}
        {isCanvasModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wand2 size={24}/> Sihirbaz Düzenleyicisi</h2>
                <button onClick={() => setIsCanvasModalOpen(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition">
                  <X size={24} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <HallDesignerCanvas ref={canvasRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. CANVAS MODE (Tam Ekran Boş Tuval)
  if (viewMode === 'canvas') {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('landing')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition flex items-center gap-2">
              <ArrowLeft size={20} /> <span className="font-medium">Geri</span>
            </button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Palette className="text-indigo-600" size={24} /> Boş Tuval Tasarımcısı
            </h2>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <HallDesignerCanvas ref={canvasRef} />
        </div>
      </div>
    );
  }

  return null;
}
