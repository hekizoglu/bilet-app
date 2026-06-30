"use client";

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [clientIdError, setClientIdError] = useState("");

  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
      setClientIdError("SİSTEM HATASI: NEXT_PUBLIC_GOOGLE_CLIENT_ID bulunamadı. Lütfen frontend dizininde bir .env.local dosyası oluşturun ve Google Client ID'nizi ekleyin.");
    }
  }, [GOOGLE_CLIENT_ID]);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      const data = await res.json();
      
      if (res.ok) {
        document.cookie = `token=${data.token}; path=/; max-age=43200; SameSite=Strict`;
        if (data.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
      } else {
        setError(`Backend Hatası: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setError(`Bağlantı Hatası: ${err.message || "Sunucuya bağlanılamadı."}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bilet Sistemi</h1>
          <p className="text-gray-500 mt-2">Devam etmek için giriş yapın</p>
        </div>

        {clientIdError && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg text-sm border border-red-300 font-semibold shadow-sm">
            {clientIdError}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-200 text-center break-words">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID" ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError("Google Auth bileşeninden bir hata döndü (örn. pencere kapatıldı veya ağ hatası).")}
                theme="filled_blue"
                shape="pill"
                size="large"
              />
            </GoogleOAuthProvider>
          ) : (
            <div className="text-sm text-gray-500 italic border p-4 rounded bg-gray-50 w-full text-center">
              Google Login butonu Client ID eksik olduğu için devre dışı.
            </div>
          )}
        </div>

        {/* Yerel Geliştirme İçin Test Butonu */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center">
          <p className="text-xs text-gray-400 mb-3">Google Auth olmadan hızlı test için:</p>
          <button
            onClick={() => handleSuccess({ credential: "LOCAL_TEST_TOKEN" })}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors shadow-sm"
          >
            Local Test Girişi Yap
          </button>
        </div>
      </div>
    </div>
  );
}
