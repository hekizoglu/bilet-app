"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function EventStaffPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${id}/staff`, {
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${id}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Görevli başarıyla eklendi.");
        setEmail('');
        fetchStaff();
      } else {
        toast.error(data.error || "Eklenemedi.");
      }
    }catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${id}/staff/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
        }
      });
      if (res.ok) {
        toast.success("Görevli silindi.");
        fetchStaff();
      } else {
        toast.error("Silinemedi.");
      }
    }catch {
      toast.error("Bir hata oluştu.");
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="text-blue-600" size={32} />
        <h1 className="text-3xl font-bold text-gray-900">Görevli (Personel) Yönetimi</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4">Yeni Kapı Görevlisi Ekle</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Görevlinin E-posta Adresi (Sistemde kayıtlı olmalıdır)"
            className="flex-1 px-4 py-2 border rounded-xl"
            required
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 hover:bg-blue-700">
            <UserPlus size={20} />
            Ekle
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4">Yetkili Görevliler (Kapı Kontrol)</h2>
        {staff.length === 0 ? (
          <p className="text-gray-500">Henüz hiçbir görevli eklenmedi. Biletleri sadece siz okutabilirsiniz.</p>
        ) : (
          <div className="space-y-3">
            {staff.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold text-gray-900">{s.user.name || "İsimsiz Kullanıcı"}</p>
                  <p className="text-gray-500 text-sm">{s.user.email}</p>
                </div>
                <button
                  onClick={() => handleRemove(s.userId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
