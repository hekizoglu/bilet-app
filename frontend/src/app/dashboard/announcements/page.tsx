"use client";

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  INFO: { icon: <Info className="text-blue-500" size={20} />, label: 'Bilgi', cls: 'text-blue-600 border-blue-200 bg-blue-50' },
  SUCCESS: { icon: <CheckCircle className="text-green-500" size={20} />, label: 'Başarı', cls: 'text-green-600 border-green-200 bg-green-50' },
  WARNING: { icon: <AlertTriangle className="text-amber-500" size={20} />, label: 'Uyarı', cls: 'text-amber-600 border-amber-200 bg-amber-50' },
  ALERT: { icon: <AlertTriangle className="text-red-500" size={20} />, label: 'Kritik', cls: 'text-red-600 border-red-200 bg-red-50' },
};

export default function AnnouncementsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Duyuru formu
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO', targetEmail: '' });
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      toast.success("Tüm bildirimler okundu olarak işaretlendi.");
      fetchNotifications();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const markSingleAsRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const sendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.warning("Başlık ve mesaj zorunludur.");
      return;
    }
    setSending(true);
    try {
      const data = await apiFetch<{ createdCount: number }>('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          type: form.type,
          ...(form.targetEmail.trim() ? { targetEmail: form.targetEmail.trim() } : {}),
        }),
      });
      toast.success(`Duyuru gönderildi (${data.createdCount} kullanıcıya).`);
      setForm({ title: '', message: '', type: 'INFO', targetEmail: '' });
      setFormOpen(false);
      fetchNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duyuru gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const getTypeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES.INFO;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="text-blue-600" />
            Bildirimler & Duyurular
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sistem ve etkinlik durumlarıyla ilgili tüm bildirimleriniz.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Send size={16} />
            Duyuru Oluştur
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCheck size={16} />
              Tümünü Okundu İşaretle ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Duyuru oluşturma formu */}
      {formOpen && (
        <form onSubmit={sendAnnouncement} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Yeni Duyuru Gönder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Başlık *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn: Bakım çalışması"
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Tür</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="INFO">Bilgi</option>
                <option value="SUCCESS">Başarı</option>
                <option value="WARNING">Uyarı</option>
                <option value="ALERT">Kritik</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Mesaj *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
              placeholder="Duyuru metni..."
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Hedef Kullanıcı (Opsiyonel — boş bırakılırsa TÜM kullanıcılara gider)
            </label>
            <input
              type="email"
              value={form.targetEmail}
              onChange={(e) => setForm({ ...form, targetEmail: e.target.value })}
              placeholder="kullanici@example.com"
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition"
            >
              <Send size={15} />
              {sending ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Bildirimler yükleniyor...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz Bildirim Yok</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Etkinliklerinize ait rezervasyon, RSVP değişiklikleri veya hatırlatmalar burada görünecektir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const style = getTypeStyle(n.type);
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markSingleAsRead(n.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 items-start ${
                  n.isRead ? 'bg-white border-gray-100' : 'bg-blue-50/40 border-blue-100 shadow-sm'
                }`}
              >
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-gray-100">
                  {style.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${n.isRead ? 'text-gray-800' : 'text-gray-900 font-extrabold'}`}>
                        {n.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.cls}`}>
                        {style.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(n.createdAt).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-2 shrink-0"></span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
