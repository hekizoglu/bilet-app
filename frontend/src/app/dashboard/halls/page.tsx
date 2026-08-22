"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { MapIcon, ArrowRight, Copy } from 'lucide-react';
import Link from 'next/link';

export default function HallsPage() {
  const [halls, setHalls] = useState<{ id: string; name: string; seatCount?: number; calculatedSeatCount?: number; address?: string | null; isGlobal?: boolean; description?: string | null }[]>([]);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchHalls = useCallback(async () => {
    const token = getCookie('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/halls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHalls(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  const handleClone = async (id: string) => {
    const token = getCookie('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/halls/${id}/clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Salon kopyalandı! Kopyası üzerinde değişiklik yapabilirsiniz.');
        fetchHalls();
      } else {
        const data = await res.json();
        toast.error(`Hata: ${data.error || 'Bilinmeyen hata'}`);
      }
    }catch {
      toast.error('Sunucuya bağlanılamadı');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MapIcon className="text-blue-600" />
          Salonlar
        </h1>
        <Link 
          href="/dashboard/designer"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          Yeni Salon Tasarla
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4 font-medium">Salon Adı</th>
              <th className="p-4 font-medium">Açıklama</th>
              <th className="p-4 font-medium">Koltuk Sayısı</th>
              <th className="p-4 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {halls.map((hall) => (
              <tr key={hall.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {hall.name}
                    {hall.isGlobal && (
                      <span className="inline-flex items-center py-0.5 px-2 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Küresel
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-gray-600">{hall.description || '-'}</td>
                <td className="p-4 text-gray-600">
                  <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {hall.seatCount} Koltuk
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-4">
                    <Link href={`/dashboard/designer?id=${hall.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      Görüntüle / Düzenle
                    </Link>
                    <button 
                      onClick={() => handleClone(hall.id)}
                      className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1"
                      title="Salon Şablonunu Kopyala"
                    >
                      <Copy size={14} />
                      Kopyasını Çıkar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {halls.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Henüz salon bulunmuyor. Tasarımcıya giderek yeni bir salon çizebilirsiniz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
