"use client";

import { useEffect, useState } from 'react';

/** Her saniye güncelleyen "şimdi" zamanı (geri sayım için) */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * Canlı tıklayan geri sayım: 2 gün : 14 saat : 05 dk : 33 sn
 * - dark?: koyu zemin üzerinde kullanım (hero kartı gibi)
 * - compact?: küçük/tek satır görünüm
 */
export default function Countdown({ target, dark = false, compact = false }: {
  target: string;
  dark?: boolean;
  compact?: boolean;
}) {
  const now = useNow();
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (diff <= 0) {
    return (
      <span className={`text-sm font-bold ${dark ? 'text-white/80' : 'text-emerald-600'}`}>
        Etkinlik başladı 🎉
      </span>
    );
  }

  const cells = [
    { v: d, l: 'gün' },
    { v: h, l: 'saat' },
    { v: m, l: 'dk' },
    { v: s, l: 'sn' },
  ];

  // Compact mod: "3 gün 14 saat" kısa gösterim
  if (compact) {
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} gün`);
    if (h > 0 || d > 0) parts.push(`${h} saat`);
    if (d === 0) parts.push(`${m} dk`);
    return (
      <span className={`text-sm font-bold tabular-nums ${dark ? 'text-white/80' : 'text-indigo-600'}`}>
        {parts.join(' ')} kaldı
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {cells.map((c, i) => (
        <div key={c.l} className="flex items-center gap-1.5">
          {i > 0 && <span className={`font-black text-lg ${dark ? 'text-white/40' : 'text-gray-300'}`}>:</span>}
          <div className={`rounded-lg px-2 py-1 text-center min-w-[46px] ${
            dark
              ? 'bg-white/15 backdrop-blur border border-white/20'
              : 'bg-gray-100 border border-gray-200'
          }`}>
            <div className={`text-lg font-black tabular-nums leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>
              {String(c.v).padStart(2, '0')}
            </div>
            <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${dark ? 'text-white/60' : 'text-gray-400'}`}>
              {c.l}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
