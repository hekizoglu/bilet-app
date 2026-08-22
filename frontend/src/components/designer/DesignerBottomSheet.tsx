import React from 'react';
import { DesignerElement } from '../../types/layout';
import { X, Trash2, Settings, Copy } from 'lucide-react';

interface DesignerBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: DesignerElement | null;
  onUpdate: (key: keyof DesignerElement, value: string | number | boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DesignerBottomSheet({ isOpen, onClose, selectedElement, onUpdate, onDelete, onDuplicate }: DesignerBottomSheetProps) {
  if (!isOpen || !selectedElement) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 transform transition-transform duration-300 ease-out p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Öğe Düzenle ({selectedElement.label || 'İsimsiz'})
        </h3>
        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Etiket</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedElement.label}
            onChange={(e) => onUpdate('label', e.target.value)}
          />
        </div>
        
        {selectedElement.seatCount !== undefined && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Kapasite</label>
            <input
              type="number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={selectedElement.seatCount}
              onChange={(e) => onUpdate('seatCount', parseInt(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={onDuplicate} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium flex justify-center items-center gap-2 hover:bg-gray-200">
          <Copy className="w-4 h-4" /> Çoğalt
        </button>
        <button onClick={onDelete} className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium flex justify-center items-center gap-2 hover:bg-red-100">
          <Trash2 className="w-4 h-4" /> Sil
        </button>
      </div>
    </div>
  );
}
