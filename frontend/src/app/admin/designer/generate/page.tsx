'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

const HallDesignerCanvas = dynamic(
  () => import('../../../../components/HallDesignerCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg">
        Tasarımcı yükleniyor...
      </div>
    ),
  }
);

export default function GeneratePage() {
  const router = useRouter();
  const canvasRef = useRef<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('autoGenerateConfig');
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        router.push('/admin/designer');
      }
    } else {
      router.push('/admin/designer');
    }
  }, [router]);

  // Canvas dynamic import sonrası ref hazır olunca tetikle
  useEffect(() => {
    if (!config || generated) return;
    const attempt = () => {
      if (canvasRef.current?.autoGenerateLayout) {
        canvasRef.current.autoGenerateLayout(config);
        setGenerated(true);
      } else {
        setTimeout(attempt, 200);
      }
    };
    attempt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Üst Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/designer')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">
              🎪 Salon Tasarımı
            </h1>
            {config && (
              <p className="text-gray-400 text-xs">
                {config.hallLengthM}m × {config.hallWidthM}m &bull; {config.tableCount > 0 ? `${config.tableCount} masa` : 'Otomatik masa'} &bull; Kapasite: max {config.totalCapacity || 2000}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => canvasRef.current?.saveLayout?.()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition"
        >
          <Save size={16} /> Kaydet
        </button>
      </div>

      {/* Canvas - Tam Ekran */}
      <div className="flex-1 overflow-hidden">
        <HallDesignerCanvas ref={canvasRef} />
      </div>
    </div>
  );
}
