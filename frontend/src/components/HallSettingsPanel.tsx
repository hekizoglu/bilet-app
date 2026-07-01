'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export interface AutoGenerateConfig {
  hallLengthM: number;
  hallWidthM: number;
  tableRadiusCm: number;
  chairsPerTable: number;
  tableCount: number;
  minSpacingCm: number;
  stageLengthM: number;
  stageWidthM: number;
  stageCount: number;
  stageCapacity: number;
  bistroCount: number;
  numberingType: 'table_only' | 'table_and_seats' | 'seats_only' | 'none';
  totalCapacity: number;
}

interface HallSettingsPanelProps {
  onAutoGenerate?: (config: AutoGenerateConfig) => void;
}

export function HallSettingsPanel({ onAutoGenerate }: HallSettingsPanelProps) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800 leading-relaxed mb-3">
          Profesyonel salon tasarımı için adim adim rehberli sihirbaz.
        </p>
        <ul className="text-xs text-blue-700 space-y-1 mb-4">
          <li>✅ Etkinlik türüne göre akıllı öneriler</li>
          <li>✅ Sahne, çıkış, bistro, VIP alanı</li>
          <li>✅ Kapasite ve güvenlik hesabı</li>
          <li>✅ Numaralı sandalye sistemi</li>
        </ul>
      </div>
      <button
        onClick={() => router.push('/admin/designer/wizard')}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-base"
      >
        <Zap size={20} /> Salon Tasarım Sihirbazı
      </button>
      <p className="text-xs text-gray-500 text-center">
        Adım adım sorularla profesyonel salon düzeni oluşturun
      </p>
    </div>
  );
}