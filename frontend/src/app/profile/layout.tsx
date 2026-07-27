"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Ticket, Settings, LogOut, User, Building, Home } from 'lucide-react';

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
        alert(err.error || "Geçiş yapılamadı.");
      }
    } catch (error) {
      alert("Sunucuya bağlanılamadı.");
    }
  };

  const navItems = [
    { name: 'Ana Sayfa', href: '/', icon: Home },
    { name: 'Biletlerim', href: '/profile', icon: Ticket },
    { name: 'Ödeme & Profil', href: '/profile/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <User className="text-blue-600 bg-blue-50 p-2 rounded-full w-10 h-10" />
          <h2 className="text-xl font-bold text-gray-800">Profilim</h2>
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
          <button
            onClick={handleSwitchRole}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm"
          >
            <Building size={20} />
            Organizasyon Paneli
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
