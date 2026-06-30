"use client";

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Ticket, ShieldAlert, Sparkles, LogIn } from 'lucide-react';

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
        if (data.user?.role === 'ADMIN' || data.user?.role === 'ORGANIZER') {
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 overflow-hidden font-sans">
      
      {/* Background Neon Ambient Glows */}
      <motion.div 
        animate={{ 
          x: [0, 40, -20, 0],
          y: [0, -40, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "mirror"
        }}
        className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -50, 30, 0],
          y: [0, 50, -40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "mirror"
        }}
        className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none"
      />
      
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative z-10 w-full max-w-md p-8 bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 mx-4"
      >
        
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-t-3xl opacity-75" />

        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl mb-4 text-blue-400 shadow-inner"
          >
            <Ticket size={32} className="stroke-[1.5]" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2"
          >
            Bilet Sistemi <Sparkles size={18} className="text-blue-400 animate-pulse" />
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 mt-2 text-sm"
          >
            Devam etmek için giriş yapın
          </motion.p>
        </div>

        {clientIdError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-950/40 text-red-300 rounded-2xl text-xs border border-red-500/30 flex gap-2 font-medium shadow-md backdrop-blur-sm"
          >
            <ShieldAlert size={18} className="shrink-0 text-red-400" />
            <div>{clientIdError}</div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-amber-950/40 text-amber-300 rounded-xl text-xs border border-amber-500/30 text-center break-words backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Google Authentication Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID" ? (
            <div className="w-full flex justify-center hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => setError("Google Auth bileşeninden bir hata döndü (örn. pencere kapatıldı veya ağ hatası).")}
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                />
              </GoogleOAuthProvider>
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic border border-slate-800 p-4 rounded-2xl bg-slate-900/60 w-full text-center">
              Google Login butonu Client ID eksik olduğu için devre dışı.
            </div>
          )}
        </motion.div>

        {/* Local Test Login Bypass Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col items-center w-full"
        >
          <p className="text-xs text-slate-500 mb-4">Google Auth olmadan hızlı test için:</p>
          <div className="grid grid-cols-3 gap-2 w-full">
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 10px rgba(59, 130, 246, 0.2)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSuccess({ credential: "LOCAL_CUSTOMER_TOKEN" })}
              className="py-3 px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-[10px] transition-all shadow-md flex items-center justify-center border border-slate-700/50"
            >
              Kullanıcı Girişi
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 12px rgba(99, 102, 241, 0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSuccess({ credential: "LOCAL_ORGANIZER_TOKEN" })}
              className="py-3 px-1 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold rounded-2xl text-[10px] transition-all shadow-md flex items-center justify-center border border-indigo-500/20"
            >
              Organizasyon
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSuccess({ credential: "LOCAL_ADMIN_TOKEN" })}
              className="py-3 px-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl text-[10px] transition-all shadow-md flex items-center justify-center border border-blue-400/20"
            >
              Admin Girişi
            </motion.button>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
