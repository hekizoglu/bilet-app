"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, AlertCircle, Calendar, CreditCard, ArrowRight, Wallet } from 'lucide-react';

interface ReportsData {
  summary: { totalPaid: number; totalPending: number; totalRefunded: number };
  methodDistribution: Record<string, number>;
  ibanTotals: Record<string, number>;
  monthlyReports: { month: string; paidCount: number; paidSum: number }[];
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const token = getCookie('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Raporlar yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
        Raporlar Yükleniyor...
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 border border-red-100 rounded-xl">
        İstatistik verileri yüklenirken bir hata oluştu.
      </div>
    );
  }

  const { summary, methodDistribution, ibanTotals, monthlyReports } = reports;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TrendingUp className="text-blue-600" />
          Finansal Raporlar & Analizler
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-semibold text-green-800 uppercase tracking-wider">Toplam Ödenmiş</span>
            <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-green-900">{summary.totalPaid.toLocaleString('tr-TR')} TL</p>
          <span className="text-xs text-green-700 mt-2 block">Tamamlanmış tahsilatlar</span>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-semibold text-amber-800 uppercase tracking-wider">Beklenen Ödemeler</span>
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-900">{summary.totalPending.toLocaleString('tr-TR')} TL</p>
          <span className="text-xs text-amber-700 mt-2 block">Doğrulama bekleyen veya askıdaki tutar</span>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-semibold text-red-800 uppercase tracking-wider">İade Edilen Tutar</span>
            <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <ArrowRight size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-red-900">{summary.totalRefunded.toLocaleString('tr-TR')} TL</p>
          <span className="text-xs text-red-700 mt-2 block">İptal edilen biletlerin toplam iadeleri</span>
        </div>
      </div>

      {/* Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Payment Methods */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="text-blue-500" />
            Ödeme Yöntemine Göre Dağılım
          </h2>
          
          <div className="space-y-4">
            {Object.entries(methodDistribution).map(([method, count]: [string, number]) => {
              const nameMap: Record<string, string> = {
                creditcard: 'Kredi Kartı',
                bankTransfer: 'Banka Transferi (Havale)',
                telegram: 'Kartsız (Telegram)',
                free: 'Ücretsiz'
              };
              const totalCount = Object.values(methodDistribution).reduce((a, b) => a + b, 0);
              const percent = totalCount ? Math.round((count / totalCount) * 100) : 0;
              
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{nameMap[method] || method}</span>
                    <span className="text-gray-500 font-mono">{count} Bilet ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        method === 'creditcard' ? 'bg-blue-600' :
                        method === 'bankTransfer' ? 'bg-emerald-600' :
                        method === 'telegram' ? 'bg-sky-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* IBAN Totals */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-purple-500" />
            Gönderen IBAN'a Göre Ödemeler
          </h2>
          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-2">
            {Object.keys(ibanTotals).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Banka transferi ile yapılmış henüz kayıt bulunmuyor.</p>
            ) : (
              Object.entries(ibanTotals).map(([iban, sum]: [string, number]) => (
                <div key={iban} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 font-mono">{iban}</p>
                    <span className="text-xs text-gray-500">Banka Transferi</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{sum.toLocaleString('tr-TR')} TL</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Payments Table */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="text-amber-500" />
          Aylık Ödeme Detayları
        </h2>
        <div className="overflow-x-auto">
          {/* Aylık satış bar grafiği */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Aylık Tahsilat Görünümü</h3>
            {monthlyReports.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Grafik için ödeme verisi bulunmuyor.</p>
            ) : (
              <>
                <div className="flex items-end gap-2 h-40">
                  {monthlyReports.map((item) => {
                    const maxSum = Math.max(...monthlyReports.map(m => m.paidSum), 1);
                    const barH = Math.max(6, Math.round((item.paidSum / maxSum) * 100));
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition">
                          {item.paidSum.toLocaleString('tr-TR')} ₺
                        </div>
                        <div
                          className="w-full max-w-[46px] bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-lg transition-all duration-500 group-hover:from-blue-500 group-hover:to-indigo-300"
                          style={{ height: `${barH}%` }}
                          title={`${item.month}: ${item.paidSum.toLocaleString('tr-TR')} ₺ (${item.paidCount} bilet)`}
                        />
                        <div className="text-[10px] text-gray-400 font-medium truncate max-w-full">{item.month.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">Çubuk yüksekliği o ayın tahsilatıyla orantılıdır (üzerine gelince tutar görünür).</p>
              </>
            )}
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4 font-medium">Ay</th>
                <th className="p-4 font-medium">Bilet Adedi</th>
                <th className="p-4 font-medium text-right">Tahsil Edilen Toplam Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {monthlyReports.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    Ödeme detayları bulunmuyor.
                  </td>
                </tr>
              ) : (
                monthlyReports.map((item) => (
                  <tr key={item.month} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-gray-900">{item.month}</td>
                    <td className="p-4 text-gray-600 font-mono">{item.paidCount} Bilet</td>
                    <td className="p-4 font-bold text-gray-900 text-right">{item.paidSum.toLocaleString('tr-TR')} TL</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
