"use client";
import dynamic from 'next/dynamic';
import { HallSettingsPanel } from '../../../components/HallSettingsPanel';

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
