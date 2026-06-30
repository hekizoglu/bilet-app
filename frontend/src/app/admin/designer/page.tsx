"use client";
import dynamic from 'next/dynamic';

// Konva kütüphanesi window objesi aradığı için SSR (Server Side Rendering) kapatılır.
const HallDesignerCanvas = dynamic(() => import('../../../components/HallDesignerCanvas'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">Tasarımcı yükleniyor...</div>
});

export default function DesignerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salon Tasarımcısı</h1>
        <p className="text-gray-500 mt-2">
          Etkinlikleriniz için oturma planlarını sürükle-bırak ile hazırlayın. "Izgaraya Hizalama (Snap to Grid)" 
          özelliği aktiftir.
        </p>
      </div>

      <HallDesignerCanvas />
    </div>
  );
}
