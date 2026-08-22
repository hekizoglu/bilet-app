"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Ticket, Settings, LogOut, User, Building, Home } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleSwitchRole = async () => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/switch-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=43200; SameSite=Strict`;
        router.push('/dashboard');
      } else {
        const err = await res.json();
        toast.error(err.error || "Geçiş yapılamadı.");
      }
    } catch (error) {
      toast.error("Sunucuya bağlanılamadı.");
    }
  };

  const navItems = [
    { name: 'Ana Sayfa', href: '/', icon: Home },
    { name: 'Biletlerim', href: '/profile', icon: Ticket },
    { name: 'Ödeme & Profil', href: '/profile/settings', icon: Settings },
  ];

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <User className="text-blue-600 bg-blue-50 p-2 rounded-full w-9 h-9" />
          <h2 className="text-xl font-bold text-gray-800">Profilim</h2>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Çıkış Yap"
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Çıkış Yap"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Desktop Sidebar (hidden on mobile - UX-PROFILE-001) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <User className="text-blue-600 bg-blue-50 p-2 rounded-full w-10 h-10" />
          <h2 className="text-xl font-bold text-gray-800">Profilim</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1" aria-label="Profil Navigasyon">
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
          <button
            onClick={handleSwitchRole}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Building size={20} />
            Organizasyon Paneli
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content (responsive padding - UX-PROFILE-001) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav 
        aria-label="Mobil Profil Navigasyon" 
        className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 justify-around py-2 px-1 shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[70px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive 
                  ? 'text-blue-600 font-bold' 
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <Icon size={20} />
              <span className="text-[11px] leading-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      </div>
    </>
  );
}
