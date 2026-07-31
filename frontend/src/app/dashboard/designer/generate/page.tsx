'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Minus, RefreshCw } from 'lucide-react';
import { type AutoGenerateConfig } from '../../../../components/HallDesignerCanvas';

interface CanvasRef {
  autoGenerateLayout: (config: AutoGenerateConfig, skipConfirm?: boolean) => void;
  saveLayout?: () => void;
}

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

// ─── +/- Sayaç Bileşeni ─────────────────────────────────────────────────────
interface CounterProps {
  label: string;
  icon: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}
function Counter({ label, icon, value, min = 0, max = 100, onChange }: CounterProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 bg-white border border-gray-300 rounded-md font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center font-bold text-sm text-gray-900">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 bg-white border border-gray-300 rounded-md font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const canvasRef = useRef<CanvasRef | null>(null);
  const [config, setConfig] = useState<AutoGenerateConfig | null>(null);
  const [generated, setGenerated] = useState(false);

  // Sağ panel kontrolleri için editable config state
  const [chairsPerTable, setChairsPerTable] = useState(8);
  const [bistroCount, setBistroCount] = useState(0);
  const [stageCount, setStageCount] = useState(1);
  const [mainEntranceCount, setMainEntranceCount] = useState(1);
  const [emergencyExitCount, setEmergencyExitCount] = useState(2);
  const [hasDanceFloor, setHasDanceFloor] = useState(false);
  const [danceFloorM, setDanceFloorM] = useState(5);

  useEffect(() => {
    const stored = localStorage.getItem('autoGenerateConfig');
    if (!stored) { router.push('/dashboard/designer'); return; }
    try {
      const parsed = JSON.parse(stored) as AutoGenerateConfig;
      setConfig(parsed);
      // Sağ panel state'ini config'den doldur
      setChairsPerTable(parsed.chairsPerTable || 8);
      setBistroCount((parsed.bistroCount as number) ?? 0);
      setStageCount(parsed.stageCount ?? 1);
      setMainEntranceCount((parsed.mainEntranceCount as number) ?? 1);
      setEmergencyExitCount((parsed.emergencyExitCount as number) ?? 2);
      setHasDanceFloor(!!(parsed.hasDanceFloor));
      setDanceFloorM((parsed.danceFloorM as number) ?? 5);
    } catch {
      router.push('/dashboard/designer');
    }
  }, [router]);

  // Canvas dynamic import sonrası ref hazır olunca tetikle
  useEffect(() => {
    if (!config || generated) return;
    const attempt = () => {
      if (canvasRef.current?.autoGenerateLayout) {
        canvasRef.current.autoGenerateLayout(config, true); // İlk oluşturma — skipConfirm
        setGenerated(true);
      } else {
        setTimeout(attempt, 200);
      }
    };
    attempt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Yeniden Yerleştir fonksiyonu
  const handleRegenerate = () => {
    if (!config || !canvasRef.current) return;
    const updatedConfig: AutoGenerateConfig = {
      ...config,
      chairsPerTable,
      bistroCount,
      stageCount,
      mainEntranceCount,
      emergencyExitCount,
      hasDanceFloor,
      danceFloorM,
    };
    canvasRef.current.autoGenerateLayout(updatedConfig, false); // skipConfirm=false → onay sor
  };

  // Tahmini kapasite
  const estimatedCapacity = config
    ? (() => {
        const area = config.hallLengthM * config.hallWidthM;
        const stageArea = stageCount > 0 ? config.stageLengthM * config.stageWidthM : 0;
        const danceArea = hasDanceFloor ? danceFloorM * danceFloorM : 0;
        const usable = area - stageArea - danceArea;
        const tableDiam = (config.tableRadiusCm || 120) / 100;
        const spacing = (config.minSpacingCm || 100) / 100;
        const tables = Math.floor(usable / Math.pow(tableDiam + spacing, 2));
        return Math.min(tables * chairsPerTable, 2000);
      })()
    : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Üst Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/designer')}
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
                {config.hallLengthM}m × {config.hallWidthM}m &bull; Kapasite: ~{estimatedCapacity}
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

      {/* Ana Alan: Canvas + Sağ Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas - Sol taraf */}
        <div className="flex-1 overflow-hidden">
          <HallDesignerCanvas ref={canvasRef} />
        </div>

        {/* Sağ Panel — +/- Kontrolleri */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-800">🎛️ Düzen Kontrolleri</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Elemanları artırıp azaltın, sonra Yeniden Yerleştir&apos;e tıklayın</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Oturma */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Oturma Düzeni</p>
            <Counter
              label="Masa Başı Sandalye"
              icon="🪑"
              value={chairsPerTable}
              min={2}
              max={20}
              onChange={setChairsPerTable}
            />

            {/* Sahne & Performans */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Sahne & Performans</p>
            <Counter
              label="Sahne"
              icon="🎤"
              value={stageCount}
              min={0}
              max={4}
              onChange={setStageCount}
            />
            <div className="flex items-center justify-between py-2 px-3 bg-pink-50 rounded-lg border border-pink-200">
              <span className="text-xs font-medium text-pink-700 flex items-center gap-1.5">
                <span>💃</span> Dans Pisti
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDanceFloor}
                  onChange={(e) => setHasDanceFloor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-checked:bg-pink-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {hasDanceFloor && (
              <Counter
                label="Dans Pisti (m)"
                icon="📐"
                value={danceFloorM}
                min={2}
                max={20}
                onChange={setDanceFloorM}
              />
            )}

            {/* Servis */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Servis Alanları</p>
            <Counter
              label="Bar / Bistro"
              icon="🍹"
              value={bistroCount}
              min={0}
              max={6}
              onChange={setBistroCount}
            />

            {/* Güvenlik */}
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Güvenlik & Çıkışlar</p>
            <Counter
              label="Ana Giriş"
              icon="🚪"
              value={mainEntranceCount}
              min={1}
              max={6}
              onChange={setMainEntranceCount}
            />
            <Counter
              label="Acil Çıkış"
              icon="🆘"
              value={emergencyExitCount}
              min={1}
              max={8}
              onChange={setEmergencyExitCount}
            />
          </div>

          {/* Yeniden Yerleştir Butonu */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 space-y-2">
            <div className="bg-blue-50 rounded-lg p-2 text-[10px] text-blue-700 text-center">
              ~{estimatedCapacity} kişilik kapasite
            </div>
            <button
              onClick={handleRegenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm hover:shadow-lg transition"
            >
              <RefreshCw size={16} /> Yeniden Yerleştir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
