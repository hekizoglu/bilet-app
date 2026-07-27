"use client";

import React from 'react';
import { 
  Cake, Heart, Gem, TreePine, GlassWater, 
  Briefcase, GraduationCap, Trophy, Music, MoreHorizontal 
} from 'lucide-react';

const eventTypes = [
  { id: 'DogumGunu', label: 'Doğum Günü', icon: Cake },
  { id: 'Nisan', label: 'Nişan', icon: Heart },
  { id: 'Dugun', label: 'Düğün', icon: Gem },
  { id: 'Piknik', label: 'Piknik', icon: TreePine },
  { id: 'Parti', label: 'Parti', icon: GlassWater },
  { id: 'Toplanti', label: 'Toplantı', icon: Briefcase },
  { id: 'Mezuniyet', label: 'Mezuniyet', icon: GraduationCap },
  { id: 'Spor', label: 'Spor Etkinliği', icon: Trophy },
  { id: 'Konser', label: 'Konser', icon: Music },
  { id: 'Diger', label: 'Diğer', icon: MoreHorizontal },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function StepEventType({ value, onChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Etkinlik Türü</h2>
        <p className="text-gray-500 mt-1">Ne tür bir etkinlik düzenliyorsunuz?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {eventTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
              }`}
            >
              <Icon size={32} strokeWidth={isSelected ? 2.5 : 2} />
              <span className="font-medium text-sm text-center">{type.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-6 border-t mt-8">
        <button
          onClick={onNext}
          disabled={!value}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Devam Et
        </button>
      </div>
    </div>
  );
}
