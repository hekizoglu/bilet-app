"use client";

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Map as MapIcon, Users, LogOut, Settings, User } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    try {
      const token = getCookie('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const base64Url = token.split('.')[1];
      if (!base64Url) {
        if (token.startsWith('LOCAL_')) {
          setUserRole(token.includes('ADMIN') ? 'ADMIN' : 'ORGANIZER');
          return;
        }
        router.push('/login');
        return;
      }

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      setUserRole(decoded.role);

      if (decoded.role !== 'ADMIN' && decoded.role !== 'ORGANIZER') {
        router.push('/profile');
      }
    } catch (e) {
      console.error("Token decoding error:", e);
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleSwitchRole = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/switch-role', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=43200; SameSite=Strict`;
        router.push('/profile');
      } else {
        const err = await res.json();
        alert(err.error || "Geçiş yapılamadı.");
      }
    } catch (error) {
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Canlı Analitik', href: '/admin/analytics', icon: LayoutDashboard },
    { name: 'Etkinlikler', href: '/admin/events', icon: Calendar },
    { name: 'Salonlar', href: '/admin/halls', icon: MapIcon },
    { name: 'Rezervasyonlar', href: '/admin/reservations', icon: Users },
    { name: 'Kuponlar', href: '/admin/coupons', icon: Users }, // Replace icon later if needed
    { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-50">
        <h2 className="text-xl font-bold text-gray-800">Bilet Yönetimi</h2>
        <button
          onClick={handleLogout}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Çıkış Yap"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Bilet Yönetimi</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {userRole === 'ORGANIZER' && (
            <button
              onClick={handleSwitchRole}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm"
            >
              <User size={20} />
              Kullanıcı Paneli
            </button>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 justify-around py-1 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
