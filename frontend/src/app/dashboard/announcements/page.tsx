"use client";

import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Tüm bildirimler okundu olarak işaretlendi.");
        fetchNotifications();
      }
    }catch {
      toast.error("İşlem başarısız.");
    }
  };

  const markSingleAsRead = async (id: string) => {
    try {
      const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="text-amber-500" size={20} />;
      case 'SUCCESS':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="text-blue-600" />
            Bildirimler & Duyurular
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sistem ve etkinlik durumlarıyla ilgili tüm bildirimleriniz.</p>
        </div>

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
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markSingleAsRead(n.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 items-start ${
                n.isRead ? 'bg-white border-gray-100' : 'bg-blue-50/40 border-blue-100 shadow-sm'
              }`}
            >
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-gray-100">
                {getTypeIcon(n.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold ${n.isRead ? 'text-gray-800' : 'text-gray-900 font-extrabold'}`}>
                    {n.title}
                  </h3>
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
          ))}
        </div>
      )}
    </div>
  );
}
