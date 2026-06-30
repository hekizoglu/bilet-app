"use client";

import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [iban, setIban] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIban(data.iban || '');
        setWhatsappPhone(data.whatsappPhone || '');
        setPaymentMethod(data.paymentMethod || 'creditcard');
      }
    } catch (err) {
      console.error("Profil yüklenirken hata:", err);
      setError("Profil bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCookie('token')}`
        },
        body: JSON.stringify({ iban, whatsappPhone, paymentMethod })
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Kaydedilirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profil & Ödeme Bilgileri</h1>
      
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-600 p-4 rounded-lg">
          Bilgileriniz başarıyla kaydedildi!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Ödeme Tercihleriniz</h2>
          <p className="text-sm text-gray-500 mb-4">
            Bu bilgiler, kartsız ödeme seçeneği olan etkinliklerde size daha hızlı hizmet verebilmemiz için kullanılacaktır.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Varsayılan Ödeme Yöntemi</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="creditcard">Kredi Kartı</option>
              <option value="bankTransfer">Banka Transferi (EFT/Havale)</option>
              <option value="whatsapp">WhatsApp ile İletişim</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN Numaranız (İadeler veya transfer doğrulaması için)</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="TR..."
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Numaranız</label>
            <input
              type="text"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="+905..."
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
