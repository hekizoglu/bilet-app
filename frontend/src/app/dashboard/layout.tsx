"use client";

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Map as MapIcon, Users, LogOut, Settings, User, Bell, Menu, X, BarChart3, Tag } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && moreDrawerOpen) {
        setMoreDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreDrawerOpen]);

  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleSwitchRole = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/users/switch-role`, {
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
        toast.error(err.error || "Geçiş yapılamadı.");
      }
    } catch (error) {
      toast.error("Sunucuya bağlanılamadı.");
    }
  };

  // Tüm menüler (Masaüstü yan menüde görünür)
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Canlı Analitik', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Etkinlikler', href: '/dashboard/events', icon: Calendar },
    { name: 'Salonlar', href: '/dashboard/halls', icon: MapIcon },
    { name: 'Rezervasyonlar', href: '/dashboard/reservations', icon: Users },
    { name: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { name: 'Kuponlar', href: '/dashboard/coupons', icon: Tag },
    { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
  ];

  // UX-ADMIN-002: Mobil alt barda en fazla 4 ana sekme
  const primaryNavItems = [
    { name: 'Özet', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Etkinlikler', href: '/dashboard/events', icon: Calendar },
    { name: 'Rezervasyon', href: '/dashboard/reservations', icon: Users },
    { name: 'Salonlar', href: '/dashboard/halls', icon: MapIcon },
  ];

  // "Daha Fazla" menüsünde görünecek ikincil sekmeler
  const secondaryNavItems = [
    { name: 'Canlı Analitik', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { name: 'Kuponlar', href: '/dashboard/coupons', icon: Tag },
    { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <Toaster position="top-center" richColors />
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h2 className="text-xl font-bold text-gray-800">Organizasyon Paneli</h2>
        <button
          onClick={handleLogout}
          aria-label="Çıkış Yap"
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Çıkış Yap"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Organizasyon Paneli</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1" aria-label="Ana Navigasyon">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <User size={20} />
              Kullanıcı Paneli
            </button>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* UX-ADMIN-002: Mobil Alt Tab Bar (4 Ana Sekme + Daha Fazla) */}
      <nav 
        aria-label="Mobil Alt Navigasyon" 
        className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 justify-around py-2 px-1 shadow-lg"
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] leading-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* 5. Buton: Daha Fazla Drawer açıcı */}
        <button
          onClick={() => setMoreDrawerOpen(true)}
          aria-label="Daha Fazla Menü"
          aria-expanded={moreDrawerOpen}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            moreDrawerOpen ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Menu size={20} />
          <span className="text-[10px] leading-tight">Daha Fazla</span>
        </button>
      </nav>

      {/* UX-ADMIN-002: Mobil "Daha Fazla" Drawer (Bottom Sheet) */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setMoreDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Bottom Sheet Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Diğer Menüler"
            className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Diğer Menüler</h3>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                aria-label="Kapat"
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMoreDrawerOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              {userRole === 'ORGANIZER' && (
                <button
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    handleSwitchRole();
                  }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <User size={20} />
                  <span>Kullanıcı Paneli</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMoreDrawerOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <LogOut size={20} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
