"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function TelegramWebAppAuth() {
  const router = useRouter();
  const [status, setStatus] = useState("Telegram WebApp yükleniyor...");

  useEffect(() => {
    // Load Telegram WebApp Script dynamically if not present
    if (!window.Telegram) {
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-web-app.js";
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        initTg();
      };
    } else {
      initTg();
    }
  }, []);

  const initTg = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        setStatus("Telegram WebApp API bulunamadı.");
        return;
      }

      tg.ready();
      setStatus("Kimlik doğrulanıyor...");

      const initData = tg.initData;
      const initDataUnsafe = tg.initDataUnsafe;

      if (!initData && !initDataUnsafe?.user) {
        setStatus("Telegram verisi alınamadı. Sadece Telegram içinden erişilebilir.");
        return;
      }

      const res = await fetch('http://localhost:5000/api/telegram/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initData: initData,
          userParams: initDataUnsafe?.user
        })
      });

      if (res.ok) {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=2592000; SameSite=Strict`;
        setStatus("Giriş başarılı! Yönlendiriliyorsunuz...");
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        const err = await res.json();
        setStatus(`Hata: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
      setStatus("Bir hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Head>
        <title>Telegram Girişi</title>
      </Head>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2 text-gray-900">Telegram WebApp</h1>
        <p className="text-sm text-gray-500 font-medium">
          {status}
        </p>
        
        {status.includes('yükleniyor') || status.includes('doğrulanıyor') ? (
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
