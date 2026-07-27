"use client";

import { Bell } from 'lucide-react';

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="text-blue-600" />
          Duyurular
        </h1>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Çok Yakında!</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Duyurular modülü henüz geliştirme aşamasındadır. Yakında katılımcılarınıza tek tıkla e-posta veya SMS ile duyuru gönderebileceksiniz.
        </p>
      </div>
    </div>
  );
}
