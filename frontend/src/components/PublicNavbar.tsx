"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Info, Globe, LogIn, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function PublicNavbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check login state
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    setIsLoggedIn(!!token);
  }, []);

  // Admin sayfalarinda veya gizli sayfalarda navbar'i gosterme
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/login') || pathname?.startsWith('/payment')) {
    return null;
  }

  // Eger anasayfadaysak (hero var) navbar absolute olsun, degilse sticky ve arka planli
  const isHome = pathname === '/';
  
  return (
    <div className={`${isHome ? 'absolute top-0 right-0 z-50 p-4 md:p-6 w-full flex justify-end pointer-events-none' : 'sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 w-full flex justify-center'}`}>
      <div className={`pointer-events-auto flex flex-wrap items-center justify-center gap-3 ${isHome ? '' : 'w-full max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
        
        {!isHome && (
          <Link 
            href="/"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition font-bold shadow-sm"
          >
            <Home size={18} />
            <span className="hidden sm:inline">Ana Sayfa</span>
          </Link>
        )}

        <Link 
          href="/nasil-calisir"
          className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition font-bold shadow-lg backdrop-blur-md border ${isHome ? 'bg-white/20 hover:bg-white/30 text-white border-white/20' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'}`}
        >
          <Info size={18} />
          <span className="hidden sm:inline">Nasıl Çalışır?</span>
        </Link>
        
        <Link 
          href="/aggregator"
          className="flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition font-bold shadow-lg backdrop-blur-md"
        >
          <Globe size={18} />
          Keşif Portalı
        </Link>
        
        {isLoggedIn ? (
          <Link 
            href="/profile"
            className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full backdrop-blur-md border transition text-sm font-semibold shadow-lg ${isHome ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-gray-800 hover:bg-gray-900 text-white border-gray-700'}`}
          >
            <User size={18} />
            <span className="hidden sm:inline">Hesabım / Yönetim</span>
          </Link>
        ) : (
          <Link 
            href="/login"
            className="flex items-center gap-2 bg-white text-blue-900 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:bg-gray-100 transition font-bold shadow-lg border border-gray-200"
          >
            <LogIn size={18} />
            Giriş Yap
          </Link>
        )}
      </div>
    </div>
  );
}
