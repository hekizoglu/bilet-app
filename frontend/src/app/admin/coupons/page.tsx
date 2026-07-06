"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    maxUses: '',
    validUntil: ''
  });

  const fetchCoupons = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const res = await fetch('http://localhost:5000/api/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const payload: any = {
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
      };
      if (form.maxUses) payload.maxUses = parseInt(form.maxUses);
      if (form.validUntil) payload.validUntil = form.validUntil;

      const res = await fetch('http://localhost:5000/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Kupon başarıyla oluşturuldu.");
        setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', maxUses: '', validUntil: '' });
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(`Hata: ${err.error}`);
      }
    } catch (err) {
      alert("Bir hata oluştu.");
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Bu kuponu pasife almak istediğinize emin misiniz?")) return;
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      const res = await fetch(`http://localhost:5000/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch (err) {
      alert("Hata oluştu.");
    }
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">İndirim Kuponları</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4">Yeni Kupon Oluştur</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Kupon Kodu</label>
            <input required type="text" placeholder="YAZ20" className="w-full border p-2 rounded-xl"
                   value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">İndirim Tipi</label>
            <select className="w-full border p-2 rounded-xl"
                    value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
              <option value="PERCENTAGE">Yüzde (%)</option>
              <option value="FIXED">Sabit Tutar (TL)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Değer</label>
            <input required type="number" step="0.01" placeholder="Örn: 20" className="w-full border p-2 rounded-xl"
                   value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Limit (Opsiyonel)</label>
            <input type="number" placeholder="Sınırsız" className="w-full border p-2 rounded-xl"
                   value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Son Tarih (Opsiyonel)</label>
            <input type="datetime-local" className="w-full border p-2 rounded-xl"
                   value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})} />
          </div>
          <div className="lg:col-span-5 flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700">
              Oluştur
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 text-sm font-bold text-gray-700">Kod</th>
              <th className="p-4 text-sm font-bold text-gray-700">İndirim</th>
              <th className="p-4 text-sm font-bold text-gray-700">Kullanım</th>
              <th className="p-4 text-sm font-bold text-gray-700">Durum</th>
              <th className="p-4 text-sm font-bold text-gray-700 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-4 font-mono font-bold">{c.code}</td>
                <td className="p-4">
                  {c.discountType === 'PERCENTAGE' ? `%${c.discountValue}` : `${c.discountValue} TL`}
                </td>
                <td className="p-4 text-sm">
                  {c.usedCount} / {c.maxUses || '∞'}
                </td>
                <td className="p-4">
                  {c.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold">Aktif</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold">Pasif</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {c.isActive && (
                    <button onClick={() => handleDeactivate(c.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">
                      İptal Et
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Henüz kupon oluşturulmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
